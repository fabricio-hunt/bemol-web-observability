export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Observabilidade Web Bemol</h1>
      <p className="text-gray-600">
        Painel em construção. Os dados de Core Web Vitals e SEO técnico serão exibidos aqui
        assim que a camada de ingestão e a tabela agregada (
        <code className="rounded bg-gray-100 px-1 py-0.5">cwv_daily_agg</code>) estiverem
        disponíveis.
      </p>
    </main>
  );
}
