import Link from "next/link";

export default function Custom404() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
      <span className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
        404
      </span>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
        Página não encontrada
      </h1>
      <p className="mt-2 max-w-md text-base text-slate-200">
        Não conseguimos localizar o recurso solicitado. Verifique o endereço ou
        volte para o painel principal.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
