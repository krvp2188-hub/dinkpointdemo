export default function AuthErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">
          Confirmation Link Error
        </h1>

        <p className="mt-4 text-gray-600">
          The confirmation link is invalid or has expired.
        </p>

        <a
          href="/signup"
          className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-white"
        >
          Back to Sign Up
        </a>
      </div>
    </main>
  )
}