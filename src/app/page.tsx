export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f1e8] text-[#171312]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <nav className="flex items-center justify-between border-b border-[#d8cfc1] pb-5">
          <span className="text-lg font-semibold tracking-[0.18em]">MMX</span>
          <span className="text-sm font-medium text-[#6f6659]">Vercel launch build</span>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-[#8d3d30]">
              New project
            </p>
            <h1 className="text-5xl font-semibold leading-tight text-[#171312] sm:text-7xl">
              MMX starts here.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#5f574d]">
              A fresh Next.js app, ready for Vercel, branding, pages, data, and whatever
              MMX needs to become next.
            </p>
          </div>

          <div className="border border-[#d8cfc1] bg-[#fffaf1] p-6 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6f6659]">
                Status
              </span>
              <span className="rounded-sm bg-[#233b32] px-3 py-1 text-sm font-medium text-[#f6f1e8]">
                Ready
              </span>
            </div>
            <dl className="space-y-5 text-sm">
              <div className="flex items-center justify-between border-b border-[#e8dfd0] pb-4">
                <dt className="text-[#6f6659]">Framework</dt>
                <dd className="font-medium">Next.js</dd>
              </div>
              <div className="flex items-center justify-between border-b border-[#e8dfd0] pb-4">
                <dt className="text-[#6f6659]">Hosting</dt>
                <dd className="font-medium">Vercel</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#6f6659]">Project</dt>
                <dd className="font-medium">MMX</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
