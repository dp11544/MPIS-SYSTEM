package com.mpsystem.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync // 🔥 CRITICAL: without this, @Async does NOTHING
public class AsyncConfig {

    @Bean(name = "alertExecutor")
    public Executor alertExecutor() {

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // 🔥 Core threads (always alive)
        executor.setCorePoolSize(5);

        // 🔥 Max threads (peak load)
        executor.setMaxPoolSize(20);

        // 🔥 Queue before spawning new threads
        executor.setQueueCapacity(200);

        // 🔥 Thread naming (for logs/debugging)
        executor.setThreadNamePrefix("ALERT-ASYNC-");

        // 🔥 Graceful shutdown (important in Render)
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);

        executor.initialize();

        return executor;
    }
}