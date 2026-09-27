#!/usr/bin/env python3
"""Ajuda a correr comandos MySQL com as credenciais do .env do maelgsystems.

Le as mesmas variaveis que o servidor (`src/server/config.ts`), para que a
consola e a app nunca apontem para bases diferentes.

Uso:
    python3 db/maelsql.py "SELECT COUNT(*) FROM produto;"
    python3 db/maelsql.py --db maelgest "SELECT 1;"
    python3 db/maelsql.py -N "SELECT id, nome FROM tenant;"
    python3 db/maelsql.py -f db/001_maelg.sql
"""
import subprocess
import sys
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parents[1]
ENV = RAIZ / ".env"


def carregar():
    cfg = {}
    if not ENV.exists():
        sys.exit(f"Nao encontro o {ENV}. Copia o .env.example para .env.")
    for linha in ENV.read_text().splitlines():
        t = linha.strip()
        if not t or t.startswith("#") or "=" not in t:
            continue
        k, v = t.split("=", 1)
        cfg[k.strip()] = v.strip()
    return cfg


def correr(sql: str, db: str, sem_cabecalho: bool = False) -> str:
    cfg = carregar()
    falta = [
        c
        for c in ("MAELG_DB_HOST", "MAELG_DB_PORT", "MAELG_DB_USER", "MAELG_DB_PASSWORD")
        if not cfg.get(c)
    ]
    if falta:
        sys.exit(f"Faltam no .env: {', '.join(falta)}")

    cmd = [
        "mysql",
        "-h", cfg["MAELG_DB_HOST"],
        "-P", cfg["MAELG_DB_PORT"],
        "-u", cfg["MAELG_DB_USER"],
        f"-p{cfg['MAELG_DB_PASSWORD']}",
    ]
    if sem_cabecalho:
        cmd.append("-N")
    if db:
        cmd.append(db)
    r = subprocess.run(cmd, input=sql, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=120)
    if r.returncode != 0:
        sys.exit(f"MySQL falhou:\n{r.stderr.strip()}")
    return r.stdout


if __name__ == "__main__":
    args = sys.argv[1:]
    db = None  # sem --db, usa a base do proprio .env
    sem_cabecalho = False

    if "-N" in args:
        args.remove("-N")
        sem_cabecalho = True

    if args and args[0] == "--db":
        args.pop(0)
        db = args.pop(0)

    if not args:
        sys.exit(__doc__)

    if args[0] == "-f":
        sql = pathlib.Path(args[1]).read_text()
    else:
        sql = " ".join(args)

    print(correr(sql, db or carregar().get("MAELG_DB_NAME", "maelg"), sem_cabecalho), end="")
