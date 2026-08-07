import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { LANDING } from '../../lib/landing.js'
import Button from '../ui/Button.jsx'
import { GoogleIcon } from '../ui/icons.jsx'

/**
 * The app's public home page as well as its sign-in screen.
 *
 * It leads with what the app is rather than with the sign-in button: a page
 * whose first and largest element is "Masuk dengan Google" reads as a login
 * wall, and Google's OAuth branding review wants a home page that explains the
 * application. The button sits after the introduction, still above most of the
 * page. Copy comes from lib/landing.js, which also generates the no-JavaScript
 * version of this page.
 */
export default function LoginScreen () {
  const { signIn, error } = useAuth()
  const [busy, setBusy] = useState(false)

  const handleSignIn = async () => {
    setBusy(true)
    await signIn()
    setBusy(false)
  }

  return (
    <main className="mx-auto w-full max-w-lg px-page py-8">
      <header className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-brand text-[26px]">
          💸
        </div>
        <h1 className="text-page-title font-bold tracking-tight">{LANDING.name}</h1>
        <p className="mx-auto mt-2 max-w-sm text-body text-subtitle">
          {LANDING.tagline}
        </p>
      </header>

      <section className="mt-6" aria-labelledby="about-heading">
        <h2 id="about-heading" className="text-section-title font-semibold">
          Apa itu {LANDING.name}
        </h2>
        <p className="mt-1.5 text-body text-subtitle">{LANDING.intro}</p>
      </section>

      <div className="mt-6">
        {error && (
          <p className="mb-3 rounded-control bg-expense/10 px-3 py-2.5 text-caption text-expense">
            {error}
          </p>
        )}
        <Button
          size="lg"
          className="w-full justify-center"
          onClick={handleSignIn}
          loading={busy}
        >
          {!busy && <GoogleIcon />}
          Masuk dengan Google
        </Button>
      </div>

      <section className="mt-8" aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-section-title font-semibold">
          Yang bisa dilakukan
        </h2>
        <ul className="mt-2 space-y-3">
          {LANDING.features.map((feature) => (
            <li key={feature.title} className="flex items-start gap-2.5">
              <span aria-hidden="true" className="text-[17px] leading-6">
                {feature.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-body font-medium">{feature.title}</span>
                <span className="block text-caption text-subtitle">
                  {feature.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-section-title font-semibold">
          Cara kerjanya
        </h2>
        <ol className="mt-2 space-y-2">
          {LANDING.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-onsoft"
              >
                {index + 1}
              </span>
              <span className="text-caption text-subtitle">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8" aria-labelledby="access-heading">
        <h2 id="access-heading" className="text-section-title font-semibold">
          Data yang diakses dan alasannya
        </h2>
        <dl className="mt-2 space-y-3">
          {LANDING.access.map((item) => (
            <div key={item.what}>
              <dt className="text-body font-medium">{item.what}</dt>
              <dd className="text-caption text-subtitle">{item.why}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 rounded-card border border-hairline bg-surface p-3.5 text-caption text-subtitle">
          {LANDING.privacyNote}
        </p>
      </section>

      <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-hairline pt-4 text-caption">
        {LANDING.links.map((link) => (
          <a key={link.href} className="font-medium text-brand" href={link.href}>
            {link.label}
          </a>
        ))}
      </footer>
    </main>
  )
}
