package com.denticheck.api.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DocsRedirectController {

    @GetMapping({"/docs/graphql", "/docs/graphql/"})
    public String graphqlDocs() {
        // URL을 확실히 맞추기 위해 index.html로 redirect 추천
        return "redirect:/docs/graphql/index.html";
    }
}
