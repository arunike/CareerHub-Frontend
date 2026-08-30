// Enforces the AGENTS.md comment rules so a violation fails the build, not a review.

const isDirective = (text) => /^\s*(eslint-|@ts-|prettier-|v8 ignore|c8 ignore|biome-)/.test(text);

const oneLinePerComment = {
  meta: {
    type: 'problem',
    docs: { description: 'A comment that wraps onto a second line is too long — cut it.' },
    schema: [],
    messages: {
      run: 'AGENTS.md: {{count}} comment lines in a row. One line — cut it, do not reflow it.',
      jsdoc: 'AGENTS.md: no /** */ JSDoc blocks; the types already state the signature.',
      block: 'AGENTS.md: this comment spans {{count}} lines. One line — cut it, do not reflow it.',
    },
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();

    return {
      Program() {
        for (const comment of source.getAllComments()) {
          if (comment.type !== 'Block' || isDirective(comment.value)) continue;
          if (comment.value.startsWith('*')) {
            context.report({ loc: comment.loc, messageId: 'jsdoc' });
            continue;
          }
          // A one-line /* */ is how a comment is written inside JSX, so only length is judged.
          const span = comment.loc.end.line - comment.loc.start.line + 1;
          if (span > 1) {
            context.report({ loc: comment.loc, messageId: 'block', data: { count: span } });
          }
        }

        // A run is consecutive full-line // comments with nothing else between them.
        const lineComments = source
          .getAllComments()
          .filter((comment) => comment.type === 'Line')
          .filter((comment) => {
            const before = source.text.slice(
              source.getIndexFromLoc({ line: comment.loc.start.line, column: 0 }),
              comment.range[0]
            );
            return before.trim() === '';
          });

        let run = [];
        const flush = () => {
          // A directive must sit on its own line above the code, so the line explaining it is
          // allowed to sit above the directive.
          const meaningful = run.filter((comment) => !isDirective(comment.value));
          if (meaningful.length > 1) {
            context.report({
              loc: { start: meaningful[0].loc.start, end: meaningful.at(-1).loc.end },
              messageId: 'run',
              data: { count: meaningful.length },
            });
          }
          run = [];
        };

        for (const comment of lineComments) {
          const previous = run.at(-1);
          if (previous && comment.loc.start.line === previous.loc.start.line + 1) {
            run.push(comment);
          } else {
            flush();
            run = [comment];
          }
        }
        flush();
      },
    };
  },
};

export default { rules: { 'one-line-per-comment': oneLinePerComment } };
