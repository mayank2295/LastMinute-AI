import { Link } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const LAST_UPDATED = 'June 27, 2026'
const CONTACT_EMAIL = 'mayankgupta23081@gmail.com'
const APP_NAME = 'LastMinute AI'

function LegalLayout({ title, children }) {
  const { isDark } = useTheme()
  const C = isDark
    ? { bg: '#0a0a0a', panel: '#111114', text: '#ffffff', sub: '#cbd5e1', faint: '#94a3b8', border: 'rgba(255,255,255,0.09)', link: '#4ade80' }
    : { bg: '#f6faf8', panel: '#ffffff', text: '#0a0a0a', sub: '#334155', faint: '#64748b', border: '#e5e7eb', link: '#15803d' }

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-500 rounded flex items-center justify-center">
            <Zap className="w-4 h-4 text-black" />
          </div>
          <span className="font-semibold" style={{ color: C.text }}>{APP_NAME}</span>
        </Link>
        <Link to="/" className="text-sm flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: C.sub }}>
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
      </nav>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: C.text }}>{title}</h1>
        <p className="text-sm mb-8" style={{ color: C.faint }}>Last updated: {LAST_UPDATED}</p>
        <div className="legal-body space-y-6" style={{ color: C.sub }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-3 text-xs" style={{ color: C.faint }}>
          <span>© 2026 {APP_NAME}</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:opacity-70" style={{ color: C.sub }}>Privacy</Link>
            <Link to="/terms" className="hover:opacity-70" style={{ color: C.sub }}>Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function H2({ children }) {
  const { isDark } = useTheme()
  return <h2 className="text-xl font-semibold mt-8 mb-2" style={{ color: isDark ? '#fff' : '#0a0a0a' }}>{children}</h2>
}

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how <strong>{APP_NAME}</strong> (“we”, “us”, the “App”) collects,
        uses, and protects your information when you use our web application. By using {APP_NAME},
        you agree to the practices described here.
      </p>

      <H2>1. Information We Collect</H2>
      <p>We collect only what is needed to provide the service:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Google account profile</strong> — your name and email address, obtained through Google OAuth when you sign in.</li>
        <li><strong>Google Calendar data</strong> — we read your calendar events and free/busy times, and create events (focus blocks and scheduled tasks) on your behalf, only after you grant permission.</li>
        <li><strong>App data you create</strong> — tasks, brain-dump text, reminders, focus sessions, and chat messages you enter in the App.</li>
        <li><strong>Push notification subscription</strong> — if you enable reminders, the browser push endpoint required to deliver them.</li>
        <li><strong>Uploaded images</strong> — if you use the Scan feature, the image is sent to Google Gemini to extract tasks, then discarded; we do not store the original image.</li>
      </ul>
      <p>We do <strong>not</strong> collect passwords (sign-in is handled entirely by Google) and we do <strong>not</strong> collect payment information.</p>

      <H2>2. How We Use Your Information</H2>
      <ul className="list-disc pl-6 space-y-1">
        <li>To read and organize your schedule and create calendar events you request or that the planner generates.</li>
        <li>To process your text and images with <strong>Google Gemini</strong> in order to extract, prioritize, and schedule tasks.</li>
        <li>To send you the deadline reminders you opt into.</li>
        <li>To operate, maintain, and improve the App’s core features.</li>
      </ul>

      <H2>3. Google User Data &amp; Limited Use Disclosure</H2>
      <p>
        {APP_NAME}’s use and transfer of information received from Google APIs adheres to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Google API Services User Data Policy
        </a>, including the <strong>Limited Use</strong> requirements. Specifically:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>We use Google Calendar data only to provide and improve user-facing features of the App.</li>
        <li>We do not transfer or sell this data to third parties, ad networks, or data brokers.</li>
        <li>We do not use this data for advertising.</li>
        <li>We do not allow humans to read this data unless we have your consent, it is necessary for security or to comply with the law, or the data has been aggregated and anonymized.</li>
      </ul>

      <H2>4. Data Sharing</H2>
      <p>We do not sell your personal data. We share data only with the service providers that power the App:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Google Cloud Platform / Firebase Firestore</strong> — hosting and database storage.</li>
        <li><strong>Google Gemini API</strong> — AI processing of your tasks, text, and uploaded images.</li>
        <li><strong>Google Calendar API</strong> — reading and creating your calendar events.</li>
      </ul>

      <H2>5. Data Retention &amp; Deletion</H2>
      <p>
        Your data is retained while your account is active. You may request deletion of your data at any
        time by emailing <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a>.
        You can also revoke {APP_NAME}’s access to your Google account at any time via{' '}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Google Account → Third-party access
        </a>.
      </p>

      <H2>6. Security</H2>
      <p>
        Data is transmitted over HTTPS and stored in Google Cloud. Sensitive credentials (such as service-account
        keys) are stored in Google Secret Manager and never committed to source code. No method of transmission or
        storage is 100% secure, but we take reasonable measures to protect your information.
      </p>

      <H2>7. Children’s Privacy</H2>
      <p>{APP_NAME} is not intended for users under 13, and we do not knowingly collect data from children.</p>

      <H2>8. Changes to This Policy</H2>
      <p>We may update this policy from time to time. The “Last updated” date above reflects the latest version.</p>

      <H2>9. Contact</H2>
      <p>
        Questions about this policy? Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}

export function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service (“Terms”) govern your use of <strong>{APP_NAME}</strong> (the “App”).
        By accessing or using the App, you agree to these Terms. If you do not agree, please do not use the App.
      </p>

      <H2>1. The Service</H2>
      <p>
        {APP_NAME} is an AI-powered productivity assistant that connects to your Google Calendar to help you plan,
        prioritize, and complete tasks before their deadlines. It can read your calendar, create events on your
        behalf, extract tasks from text and images using Google Gemini, and send reminders you opt into.
      </p>

      <H2>2. Eligibility &amp; Accounts</H2>
      <p>
        You must have a valid Google account and be at least 13 years old to use the App. You are responsible for
        the activity that occurs under your account and for keeping your Google credentials secure.
      </p>

      <H2>3. Acceptable Use</H2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Do not use the App for any unlawful purpose or in violation of these Terms.</li>
        <li>Do not attempt to disrupt, reverse-engineer, or gain unauthorized access to the App or its infrastructure.</li>
        <li>Do not use the App to store or process content you do not have the right to use.</li>
      </ul>

      <H2>4. AI-Generated Content</H2>
      <p>
        The App uses AI (Google Gemini) to generate plans, prioritize tasks, and create calendar events. AI output
        may be inaccurate or incomplete. <strong>You are responsible for reviewing all AI-generated plans and calendar
        changes</strong>, and {APP_NAME} is not liable for missed deadlines, scheduling errors, or decisions made based
        on AI output.
      </p>

      <H2>5. Google Services</H2>
      <p>
        The App relies on Google services (OAuth, Calendar, Gemini, Cloud). Your use of those services is also subject
        to Google’s own terms. We are not responsible for outages or changes in Google’s services that affect the App.
      </p>

      <H2>6. Availability</H2>
      <p>
        The App is provided on an “as is” and “as available” basis. It is a hackathon project and may be modified,
        suspended, or discontinued at any time without notice.
      </p>

      <H2>7. Limitation of Liability</H2>
      <p>
        To the maximum extent permitted by law, {APP_NAME} and its creators shall not be liable for any indirect,
        incidental, or consequential damages arising from your use of the App, including lost data, missed deadlines,
        or scheduling errors.
      </p>

      <H2>8. Termination</H2>
      <p>
        You may stop using the App at any time and revoke its access from your{' '}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Google Account settings
        </a>. We may suspend or terminate access if you violate these Terms.
      </p>

      <H2>9. Changes to These Terms</H2>
      <p>We may update these Terms from time to time. Continued use after changes means you accept the revised Terms.</p>

      <H2>10. Contact</H2>
      <p>
        Questions about these Terms? Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}
