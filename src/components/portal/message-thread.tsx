"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

export interface MessageData {
  id: string
  content: string
  sentByInternal: boolean
  createdDate: string
  senderName: string
}

interface SendResult {
  success: boolean
  error?: string
}

interface Props {
  title?: string
  messages: MessageData[]
  subject: string | null
  viewerIsInternal: boolean
  counterpartLabel: string
  onSend: (input: { content: string; subject?: string }) => Promise<SendResult>
}

export function MessageThread({
  title = "Nachrichten",
  messages,
  subject,
  viewerIsInternal,
  counterpartLabel,
  onSend,
}: Props) {
  const router = useRouter()
  const [subjectInput, setSubjectInput] = useState("")
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const isFirstMessage = messages.length === 0

  async function handleSend() {
    setError(null)
    if (!content.trim()) {
      setError("Inhalt ist erforderlich.")
      return
    }

    setSending(true)
    const result = await onSend({
      content: content.trim(),
      subject: isFirstMessage && subjectInput.trim() ? subjectInput.trim() : undefined,
    })
    setSending(false)

    if (!result.success) {
      setError(result.error ?? "Nachricht konnte nicht gesendet werden.")
      return
    }

    setContent("")
    setSubjectInput("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subject && <p className="text-sm text-muted-foreground">Betreff: {subject}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Nachrichten.</p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {messages.map((m) => {
              const isOwn = m.sentByInternal === viewerIsInternal
              return (
                <li
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-md border p-3 text-sm",
                    isOwn ? "ml-auto bg-primary/10" : "bg-muted"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.sentByInternal ? "Dafinex" : counterpartLabel} · {m.senderName} ·{" "}
                    {new Date(m.createdDate).toLocaleString("de-CH")}
                  </p>
                </li>
              )
            })}
          </ul>
        )}

        <div className="space-y-2 border-t pt-4">
          {isFirstMessage && (
            <div>
              <Label>Betreff (optional)</Label>
              <Input
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                placeholder="z.B. Frage zur Verfügbarkeit"
                disabled={sending}
              />
            </div>
          )}
          <div>
            <Label>Nachricht</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nachricht eingeben…"
              disabled={sending}
            />
          </div>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Wird gesendet…" : "Senden"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
