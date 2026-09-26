.PHONY: all build run server lint lint-fix deploy clean

all: build

build:
	@pnpm run build

ifeq ($(HTTPS),true)
run:
	@pnpm run dev:https
else
run:
	@pnpm run dev
endif

server:
	@pnpm run serve

lint:
	@pnpm run lint

lint-fix:
	@pnpm run lint:fix

deploy:
	@pnpm run deploy

clean:
	@pnpm run clean
