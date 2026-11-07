import type { Config } from "prettier";

const config: Config = {
    trailingComma: "all",
    tabWidth: 4,
    semi: true,
    singleQuote: false,
    bracketSpacing: true,
    printWidth: 100,
    arrowParens: "always",
    endOfLine: "lf",
    useTabs: false,
    proseWrap: "preserve",
    quoteProps: "as-needed",
    htmlWhitespaceSensitivity: "css",
    bracketSameLine: false,
    experimentalOperatorPosition: "start",
    experimentalTernaries: true,
    objectWrap: "preserve",
    overrides: [
        {
            files: ["*.yml", "*.yaml"],
            options: {
                tabWidth: 2,
                printWidth: 20,
            },
        },
    ],
};

export default config;
