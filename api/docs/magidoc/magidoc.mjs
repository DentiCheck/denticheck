export default {
    introspection: {
        type: "sdl",
        paths: ["../../src/main/resources/graphql/**/*.graphqls"],
    },
    website: {
        template: "carbon-multi-page",
        options: {
            siteRoot: "/docs/graphql",
        },
    },
};
