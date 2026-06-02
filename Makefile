.DEFAULT_GOAL := help

.PHONY: help install dev down build typecheck lint preview clean

help:
	@printf "Dungeon of Vim\n"
	@printf "\n"
	@printf "Usage:\n"
	@printf "  make install    Install npm dependencies\n"
	@printf "  make dev        Install dependencies and run Vite for VM access\n"
	@printf "  make down       Stop the local Vite dev server\n"
	@printf "  make build      Typecheck and build production assets\n"
	@printf "  make typecheck  Run TypeScript checks\n"
	@printf "  make lint       Run lint checks\n"
	@printf "  make preview    Preview the production build\n"
	@printf "  make clean      Remove generated build output\n"

install:
	npm install

dev: install
	npm run dev -- --host 0.0.0.0

down:
	@pids="$$(lsof -ti tcp:5173)"; \
	if [ -n "$$pids" ]; then \
		kill $$pids; \
		printf "Stopped dev server on port 5173.\n"; \
	else \
		printf "No dev server found on port 5173.\n"; \
	fi

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
