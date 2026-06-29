export function isAdminEmail(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim()

  if (!adminEmail || !email) {
    return false
  }

  return email.trim().toLowerCase() === adminEmail.toLowerCase()
}
