package com.denticheck.api;

import com.denticheck.api.config.GoogleMobileProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(GoogleMobileProperties.class)
public class DenticheckApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(DenticheckApiApplication.class, args);
    }
}
