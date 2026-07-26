# Manuelle Bereinigung der E2E-Test-Dokumente in Supabase Storage

Supabase erlaubt kein direktes `delete from storage.objects` per SQL (Fehler: *"Direct deletion from storage tables is not allowed. Use the Storage API instead."*) — Löschungen müssen über die Storage API laufen, damit auch die zugrunde liegende Datei (nicht nur die DB-Zeile) entfernt wird. Daher zwei Optionen unten.

## Voraussetzung
Zuerst `docs/e2e-test-data-storage-lookup.sql` im SQL Editor ausführen (**bevor** `docs/e2e-test-data-cleanup.sql` läuft!) und das Ergebnis notieren. Es liefert eine Liste wie:

| bucket | folder |
|---|---|
| candidate-documents | `1c901329-...` |
| contracts | `bc142ea7-...` |

Jede Zeile entspricht einem Ordner (`<folder>/...`) im jeweiligen Bucket, der zu den E2E-Testdaten gehört.

## Option A: Supabase Dashboard (einfachste Variante für wenige Ordner)
1. Dashboard öffnen → **Storage** in der linken Navigation
2. Bucket auswählen (`candidate-documents` bzw. `contracts`)
3. Für jede notierte `folder`-ID: den gleichnamigen Ordner in der Dateiliste suchen
4. Ordner anklicken → alle enthaltenen Dateien markieren → **Delete** (oder den ganzen Ordner über das Kontextmenü löschen, falls die UI das anbietet)
5. Wiederholen für jeden Eintrag aus der Lookup-Liste, in beiden Buckets

## Option B: Storage API per Skript (schneller bei vielen Ordnern)
Falls mehr als ein paar Ordner betroffen sind, per Node-Skript mit dem Service-Role-Key (nie im Frontend verwenden!):

```js
// cleanup-storage.mjs — einmalig lokal ausführen: node cleanup-storage.mjs
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Aus der Lookup-Query übernehmen:
const candidateFolders = ["1c901329-...", "..."]
const contractFolders = ["bc142ea7-...", "..."]

for (const bucket of ["candidate-documents"]) {
  for (const folder of candidateFolders) {
    const { data: files } = await supabase.storage.from(bucket).list(folder)
    if (files?.length) {
      const paths = files.map((f) => `${folder}/${f.name}`)
      await supabase.storage.from(bucket).remove(paths)
      console.log(`Gelöscht: ${bucket}/${folder} (${paths.length} Datei(en))`)
    }
  }
}

for (const folder of contractFolders) {
  const { data: files } = await supabase.storage.from("contracts").list(folder)
  if (files?.length) {
    const paths = files.map((f) => `${folder}/${f.name}`)
    await supabase.storage.from("contracts").remove(paths)
    console.log(`Gelöscht: contracts/${folder} (${paths.length} Datei(en))`)
  }
}
```

Vorher `npm install @supabase/supabase-js` (bereits Projekt-Abhängigkeit) und die beiden Umgebungsvariablen aus `.env.local` verfügbar machen (z.B. `node --env-file=.env.local cleanup-storage.mjs`).

## Reihenfolge insgesamt
1. `docs/e2e-test-data-storage-lookup.sql` ausführen, Ergebnis notieren
2. Storage-Dateien bereinigen (Option A oder B, siehe oben)
3. `docs/e2e-test-data-cleanup.sql` ausführen (Datenbank-Zeilen)
