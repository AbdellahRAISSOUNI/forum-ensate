export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#0b2b5c]">
      <header className="border-b border-[#0b2b5c]/10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex justify-between items-center">
          <div className="font-bold text-xl">Forum-ENSA</div>
          <div className="flex items-center gap-4">
            <a 
              href="/login" 
              className="text-sm font-medium hover:underline"
            >
              Connexion
            </a>
            <a 
              href="/register" 
              className="text-sm font-medium px-4 py-2 bg-[#0b2b5c] text-white rounded-md hover:bg-[#0a244e]"
            >
              S&apos;inscrire
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <section className="flex flex-col items-center text-center gap-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Bienvenue au <span className="underline decoration-[#d4af37] underline-offset-8">Forum-ENSA</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#143d7a]/90 max-w-2xl">
            Bienvenue sur le site officiel du Forum-ENSA Tétouan.
            Restez informé des mises à jour, des événements et des actualités de la communauté.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
            <a
              href="/register"
              className="inline-flex items-center justify-center rounded-md px-6 py-3 font-medium shadow-sm transition-colors bg-[#0b2b5c] text-white hover:bg-[#0a244e]"
            >
              Commencer
            </a>
            <a
              href="/admin/login"
              className="inline-flex items-center justify-center rounded-md px-6 py-3 font-medium border border-[#0b2b5c]/20 text-[#0b2b5c] hover:bg-[#f8fafc]"
            >
              Admin
            </a>
            <a
              href="#about"
              className="inline-flex items-center justify-center rounded-md px-6 py-3 font-medium border border-[#0b2b5c]/20 text-[#0b2b5c] hover:bg-[#f8fafc]"
            >
              En savoir plus
            </a>
          </div>

          <div className="mt-10 h-[3px] w-24 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent rounded-full" />
        </section>
      </main>

      <footer className="border-t border-[#0b2b5c]/10">
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-[#143d7a]/80 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Forum-ENSA Tétouan</span>
          <span className="text-[#d4af37] font-semibold">Site Officiel</span>
        </div>
      </footer>
    </div>
  );
}