.DEFAULT_GOAL := help

.PHONY: help install dev build typecheck lint preview clean

help:
	@printf "Dungeon of Vim\n"
	@printf "\n"
	@printf "Usage:\n"
	@printf "  make install    Install npm dependencies\n"
	@printf "  make dev        Install dependencies and run Vite for VM access\n"
	@printf "  make build      Typecheck and build production assets\n"
	@printf "  make typecheck  Run TypeScript checks\n"
	@printf "  make lint       Run lint checks\n"
	@printf "  make preview    Preview the production build\n"
	@printf "  make clean      Remove generated build output\n"

install:
	npm install

dev: install
	npm run dev -- --host 0.0.0.0

build:
	npm run build

typecheck:
	npm run typecheck

lint:
	npm run lint

preview:
	npm run preview

clean:
	rm -rf dist
