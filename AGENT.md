# AGENT.md

## Projekt cél
Ez a projekt egy MCP szerver, amely konfiguráció alapján helyi és távoli (SSH) logforrásokat tesz elérhetővé agentek számára.

## Mire való
Az agentek a szerveren keresztül tudnak:
- elérhető logforrásokat listázni,
- log sorokat chunkokban olvasni cursor alapon,
- logot "követni" rövid polling alapú módban.

## Fő működés
- A logforrások `config/log-sources.json` alapján töltődnek be.
- Támogatott source típusok:
  - `local` (helyi fájl)
  - `ssh` (távoli fájl SSH-n keresztül, `identityFile` támogatással)
- Transport módok:
  - `stdio`
  - `http` (Streamable HTTP)
  - `https-dev` (fejlesztői TLS)

## MCP toolok
- `list_logs`
- `read_log_chunk`
- `follow_log`

## Logging
- A szerver belső logolása konfigurálható a `logging` blokkban.
- Alapértelmezés szerint a self-log automatikusan felvehető source-ként, így az agent is tudja olvasni.

## Fontos üzemeltetési elvek
- `stdio` módban a szerver `stdout`-ra csak MCP JSON-RPC üzenetet írhat.
- Runtime hibakereséshez a self-log fájl az elsődleges forrás.
- Agent oldalon nagy logoknál mindig chunkolt olvasást használj (`read_log_chunk` + cursor).
