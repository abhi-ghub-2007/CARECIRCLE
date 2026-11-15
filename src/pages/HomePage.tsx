export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold text-primary">CareCircle</h1>
      <p className="max-w-md text-center text-muted-foreground">
        Elderly healthcare management — connecting families, caregivers, and those who matter most.
      </p>
      <div className="flex gap-4">
        <a href="/login" className="btn-primary">Sign In</a>
        <a href="/register" className="btn-secondary">Create Account</a>
      </div>
    </main>
  )
}
