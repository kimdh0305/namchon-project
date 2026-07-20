#!/usr/bin/env python3
import subprocess


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    # React/Vite 기반 빌드 파이프라인
    run(["npm", "install"])
    run(["npm", "run", "build"])


if __name__ == "__main__":
    main()
