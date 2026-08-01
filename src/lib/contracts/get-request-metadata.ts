import { headers } from "next/headers"

/**
 * Server-only IP/user-agent capture for the signature audit trail — read
 * from request headers, never trusted from client-submitted values, so a
 * signer can't fake their own protocol entry.
 */
export async function getRequestMetadata(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  const headerList = await headers()
  const forwardedFor = headerList.get("x-forwarded-for")
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : headerList.get("x-real-ip")
  const userAgent = headerList.get("user-agent")

  return { ipAddress, userAgent }
}
