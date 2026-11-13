import ChatPanel from '@features/chatbot-llm/src/ChatPanel.jsx'

export default function NarrationScreen() {
  return (
    <section className="flex h-full flex-col p-4 sm:p-6 bg-heat-bg text-heat-ink overflow-y-auto bih-scroll">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Narration</h2>
      <p className="mt-1 text-sm text-slate-500 sm:text-base">
        Ask about heat-index trends, drivers, and the methodology behind Bicol
        In-Heat.
      </p>
      <ChatPanel />
    </section>
  )
}
