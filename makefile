build: main.ts
	PUPPETEER_PRODUCT=chrome deno compile $?

run: main.ts
	PUPPETEER_PRODUCT=chrome deno run -A --unstable $?
