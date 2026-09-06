import { PlusOutlined } from '@ant-design/icons';

const questions = [
  {
    question: 'How is this different from a spreadsheet?',
    answer:
      'A spreadsheet holds what you type into it. CareerHub works the numbers out: it prices an offer across four years, builds your paychecks after tax and deductions, and recalculates both the moment a date or a rate changes. You maintain the facts; it maintains the arithmetic.',
  },
  {
    question: 'How accurate is the paycheck maths?',
    answer:
      'It builds the year paycheck by paycheck rather than dividing a salary by twelve: federal and state withholding, Social Security and Medicare including the wage caps, 401(k) with employer match, HSA, and pre-tax premiums. When a real payslip differs, record what it actually said and the ledger reconciles the gap instead of quietly overwriting it.',
  },
  {
    question: 'What happens when my pay changes?',
    answer:
      'Log the raise and every paycheck from that point is re-rated for you. If payroll applied it late, the months you were underpaid are settled as back pay on the cheque that catches up, and the earlier paychecks keep the rate you were genuinely paid. Accepting a new offer carries it into work history and income planning without re-entering anything.',
  },
  {
    question: 'Does it work on my phone?',
    answer:
      'Yes, and it is the same app rather than a cut-down view. Long forms open as bottom sheets sized to their content, wide tables fold into readable rows instead of scrolling sideways, and you choose which four tabs sit in the toolbar.',
  },
  {
    question: 'Do I need an AI provider?',
    answer:
      'No. Applications, interviews, documents, offers, experience, and income all work without one. Connect a provider only if you want the AI tools; the key is encrypted on the backend and used solely for requests you start.',
  },
  {
    question: 'Who can see my career data?',
    answer:
      'Only you. Every private record sits behind your account, there are no advertising trackers, and any spreadsheet you connect is read-only. You can export everything from your Profile at any time, or schedule the account for deletion with a grace period before it is removed for good.',
  },
  {
    question: 'What does it cost?',
    answer:
      'Nothing today. There is no checkout, no trial countdown, and no card on file: sign in and the whole workspace is open.',
  },
  {
    question: 'Is it for individuals or recruiting teams?',
    answer:
      'For one person managing their own career. Everything is shaped around your applications, your offers, and your pay history, so it is not a shared company workspace or an applicant-tracking system, and there are no seats to buy.',
  },
];

export default function PublicFaq() {
  return (
    <section
      id="faq"
      className="scroll-mt-28 border-y border-slate-200 bg-white px-5 py-20 dark:border-white/[0.08] dark:bg-ink-900 sm:px-8 sm:py-28 lg:px-10"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(260px,0.58fr)_minmax(0,1.42fr)] lg:items-start lg:gap-20">
        <div className="lg:sticky lg:top-28">
          <h2 className="max-w-[12ch] text-balance text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-slate-950 dark:text-ink-50 sm:text-5xl">
            The practical questions.
          </h2>
          <p className="mt-6 max-w-[42ch] text-base leading-8 text-slate-600 dark:text-ink-200">
            What CareerHub handles beyond a spreadsheet, how the numbers work, and exactly what it
            asks of you.
          </p>
        </div>

        <div className="border-t border-slate-300 dark:border-white/[0.12]">
          {questions.map((item, index) => (
            <details
              key={item.question}
              className="group border-b border-slate-200 dark:border-white/[0.08]"
            >
              <summary className="grid cursor-pointer list-none grid-cols-[28px_minmax(0,1fr)_40px] items-center gap-3 py-5 text-left outline-none transition-colors duration-200 hover:text-blue-800 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:text-blue-300 sm:grid-cols-[36px_minmax(0,1fr)_44px] sm:gap-5 sm:py-6 [&::-webkit-details-marker]:hidden">
                <span className="text-xs font-semibold tabular-nums text-slate-400 dark:text-ink-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-base font-semibold leading-6 tracking-[-0.012em] text-slate-950 transition-colors group-open:text-blue-800 dark:text-ink-50 dark:group-open:text-blue-300 sm:text-lg">
                  {item.question}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-blue-700 transition-colors duration-200 group-hover:bg-blue-50 group-open:bg-blue-50 group-open:text-blue-800 dark:text-blue-300 dark:group-hover:bg-blue-500/10 dark:group-hover:group-open:bg-blue-500/10 dark:group-open:text-blue-200 sm:h-11 sm:w-11">
                  <PlusOutlined className="text-xs transition-transform duration-300 group-open:rotate-45" />
                </span>
              </summary>
              <div className="grid grid-cols-[28px_minmax(0,1fr)_40px] gap-3 pb-7 sm:grid-cols-[36px_minmax(0,1fr)_44px] sm:gap-5 sm:pb-8">
                <p className="col-start-2 max-w-[68ch] text-[15px] leading-[1.8] text-slate-600 dark:text-ink-200">
                  {item.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
