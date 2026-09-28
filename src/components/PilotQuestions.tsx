export function PilotQuestions({ questions }: { questions: readonly { question: string; answer: string }[] }) {
  return (
    <section className="mt-12" aria-labelledby="pilot-questions">
      <h2 id="pilot-questions" className="text-xl font-semibold">Before you enquire</h2>
      <div className="mt-4 space-y-3">
        {questions.map(({ question, answer }) => (
          <details key={question} className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer font-medium hover:text-brand">{question}</summary>
            <p className="mt-3 text-sm text-muted-foreground">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
