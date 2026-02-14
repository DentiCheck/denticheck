package com.denticheck.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${report.storage.local-dir:./reports}")
    private String localReportDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path reportPath = Paths.get(localReportDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/reports/**")
                .addResourceLocations(reportPath.toUri().toString());
    }
}
