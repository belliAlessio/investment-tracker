# PAC Tracker — Design Spec
**Data:** 2026-06-03

## Contesto

L'utente ha 5 strumenti di investimento distribuiti su 3 piattaforme (3 fondi su piattaforma 1, 1 PAC su piattaforma 2, 1 fondo pensione TFR) e vuole un'app locale per registrare ogni mese il versamento effettuato e il valore totale di ogni strumento. L'obiettivo è avere una visione completa del patrimonio investito con grafici e KPI.

## Stack e Architettura

- **Frontend**: HTML + CSS + JavaScript vanilla, 3 file (`index.html`, `style.css`, `app.js`)
- **Grafici**: Chart.js caricato da CDN
- **Persistenza**: File System Access API — al primo avvio il browser chiede di scegliere (o creare) `pac-data.json`; da quel momento l'app legge e scrive su disco a ogni modifica
- **Compatibilità**: Chrome / Edge (Chromium). Se il browser non supporta la File System Access API, viene mostrato un avviso.
- **Setup**: zero installazioni — basta aprire `index.html` in Chrome

## Modello Dati

File `pac-data.json`:

```json
{
  "strumenti": [
    {
      "id": "fondo-a",
      "nome": "Fondo A",
      "piattaforma": "Piattaforma 1",
      "tipo": "fondo",
      "isin": "IE00B4L5Y983"
    }
  ],
  "registrazioni": [
    {
      "id": "reg-001",
      "mese": "2025-05",
      "strumentoId": "fondo-a",
      "versamento": 150,
      "valoreFinale": 5840
    }
  ]
}
```

**Campi strumento:**
- `id` — slug univoco (generato automaticamente)
- `nome` — nome libero
- `piattaforma` — nome della piattaforma (raggruppamento)
- `tipo` — `fondo` | `pac` | `pensione`
- `isin` — codice ISIN opzionale (es. `IE00B4L5Y983`)

**Campi registrazione:**
- `id` — UUID generato automaticamente
- `mese` — formato `YYYY-MM`
- `strumentoId` — riferimento allo strumento
- `versamento` — quanto è stato versato quel mese (€)
- `valoreFinale` — valore totale dello strumento a fine mese (€)

**Valori calcolati a runtime** (non salvati):
- Totale investito = Σ versamenti
- Rendimento € = valoreFinale - totale investito
- Rendimento % = rendimento / totale investito × 100

## Layout e Navigazione

Tab navigation in cima, 4 sezioni:

### 1. Dashboard
Layout Header + due colonne:

**Header** — 4 KPI card:
- Valore Totale (somma valori attuali tutti gli strumenti)
- Totale Investito (somma tutti i versamenti storici)
- Rendimento € (valore - investito)
- Rendimento % (colorato: verde se positivo, rosso se negativo)

**Colonna sinistra (flex: 2):**
- Grafico lineare "Patrimonio nel tempo" — una linea per piattaforma + linea tratteggiata "Investito"
- Tabella ultime registrazioni (ultimi 2-3 mesi, per tutti gli strumenti)

**Colonna destra (flex: 1):**
- Bar chart orizzontale rendimento % per strumento (verde/rosso)
- Donut chart distribuzione patrimonio per piattaforma

### 2. Inserisci
Form mensile in una schermata:
- Selettore mese (mese/anno)
- Per ogni strumento: campo `Versamento (€)` + campo `Valore finale (€)`
- Strumenti raggruppati per piattaforma
- Pulsante "Salva" — scrive il JSON su disco

### 3. Storico
- Tabella completa di tutte le registrazioni
- Filtri: per strumento, per piattaforma, per intervallo date
- Colonne: Mese | Strumento | Piattaforma | ISIN | Versamento | Valore | Rendimento € | Rendimento %
- Pulsante modifica inline per correggere un'entry
- Pulsante "Esporta JSON" per backup manuale

### 4. Strumenti
- Lista degli strumenti configurati
- Form per aggiungere strumento: Nome, Piattaforma, Tipo, ISIN (opzionale)
- Modifica e cancellazione di strumenti esistenti
- Avviso se si cancella uno strumento con registrazioni collegate

## Stile Visivo

- Tema scuro (dark mode), sfondo `#0f0f1a`
- Palette: viola `#6366f1` (piattaforma 1), blu `#3b82f6` (piattaforma 2), ambra `#f59e0b` (pensione)
- Verde `#10b981` per rendimenti positivi, rosso `#ef4444` per negativi
- Font: system-ui / sans-serif
- Border radius generosi, card con bordo superiore colorato per categoria

## Verifica End-to-End

1. Aprire `index.html` in Chrome
2. Il browser mostra il dialog per scegliere/creare `pac-data.json`
3. Andare su **Strumenti** → aggiungere un fondo con ISIN → salvare
4. Andare su **Inserisci** → selezionare il mese corrente → inserire versamento e valore → salvare
5. Aprire `pac-data.json` con un editor e verificare che i dati siano corretti
6. Tornare su **Dashboard** → verificare che KPI e grafici mostrino i dati appena inseriti
7. Andare su **Storico** → verificare che la registrazione appaia → modificarla inline → verificare aggiornamento su file
8. Ricaricare la pagina → ri-selezionare il file → verificare che tutti i dati persistano
