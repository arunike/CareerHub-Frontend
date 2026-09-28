// Enforces the AGENTS.md rule that placeholders carry substitutes, never real data.

// Safe by construction: every figure here is published in AGENTS.md or a generic round teaching number.
export const ALLOWED_FIGURES = new Set([
  '1000', '1500', '2500', '3000', '5000', '10000', '20000',
  '24750', '50000', '165000', '181500', '200000', '336000',
]);

// Already written down in the committed tooltip guard, so naming them again reveals nothing new.
const BRANDS =
  /\b(Aetna|Anthem|Kaiser|Cigna|Delta Dental|VSP|EyeMed|MetLife|Guardian|Humana|HealthSelect)\b/;

const MONEY = /[$£€]\s?\d/;
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/;

const offenceIn = (text) => {
  if (MONEY.test(text)) return { messageId: 'money' };
  if (ISO_DATE.test(text)) return { messageId: 'date' };
  if (BRANDS.test(text)) return { messageId: 'brand' };
  // A percentage is a rate, not an amount, so it carries nothing identifying.
  const amounts = text.replace(/\d+\s?%/g, '').match(/(?<![\w-])\d[\d,]{3,}(?![\w-])/g) ?? [];
  for (const figure of amounts) {
    const bare = figure.replace(/,/g, '');
    // A bare year is a date part, not an amount; the ISO check already covers a real one.
    if (bare.length === 4 && Number(bare) >= 1900 && Number(bare) <= 2099) continue;
    if (!ALLOWED_FIGURES.has(bare)) return { messageId: 'figure', data: { figure } };
  }
  return null;
};

// A placeholder reads as an invented example, so it gets written from whatever is on screen.
const noRealDataInPlaceholders = {
  meta: {
    type: 'problem',
    docs: { description: 'Placeholders must use the AGENTS.md substitutes, not real data.' },
    schema: [],
    messages: {
      money: 'AGENTS.md: no money amount in a placeholder; use a Substitutes figure.',
      date: 'AGENTS.md: no date in a placeholder; a real one identifies a person.',
      brand: 'AGENTS.md: no insurer or branded plan in a placeholder; write the shape instead.',
      figure:
        'AGENTS.md: {{figure}} is not a Substitutes figure; use 165000 / 24750 or a round example.',
    },
  },
  create(context) {
    const check = (node, text) => {
      const offence = offenceIn(text);
      if (offence) context.report({ node, ...offence });
    };

    const isPlaceholderName = (name) => name === 'placeholder' || name === 'dateRequiredMessage';

    return {
      JSXAttribute(node) {
        if (node.name?.type !== 'JSXIdentifier' || !isPlaceholderName(node.name.name)) return;
        const literals = [];
        const collect = (value) => {
          if (!value) return;
          if (value.type === 'Literal' && typeof value.value === 'string') literals.push(value);
          else if (value.type === 'JSXExpressionContainer') collect(value.expression);
          else if (value.type === 'ConditionalExpression') {
            collect(value.consequent);
            collect(value.alternate);
          } else if (value.type === 'TemplateLiteral') literals.push(...value.quasis);
        };
        collect(node.value);
        for (const literal of literals) {
          check(literal, literal.value?.cooked ?? literal.value?.raw ?? String(literal.value));
        }
      },
      Property(node) {
        const key = node.key?.name ?? node.key?.value;
        if (!isPlaceholderName(key)) return;
        if (node.value?.type === 'Literal' && typeof node.value.value === 'string') {
          check(node.value, node.value.value);
        }
      },
    };
  },
};

export default { rules: { 'no-real-data-in-placeholders': noRealDataInPlaceholders } };
