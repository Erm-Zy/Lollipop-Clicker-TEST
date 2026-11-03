package com.ermzy.lollipopclicker;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class GameOfflineTest {
    private String js(ActivityScenario<MainActivity> scenario, String code) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(code, value -> { result.set(value); latch.countDown(); }));
        assertTrue("WebView não respondeu", latch.await(10, TimeUnit.SECONDS));
        return result.get();
    }
    private void ready(ActivityScenario<MainActivity> scenario) throws Exception {
        for(int i=0;i<150;i++) {
            if("true".equals(js(scenario,"document.body && document.body.dataset.readonly === 'false'"))) return;
            Thread.sleep(200);
        }
        fail("Jogo não inicializou no WebView");
    }
    @Test public void bundledPagesAndRestartRetainProgress() throws Exception {
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            ready(scenario);
            js(scenario,"document.getElementById('lollipop').click()");
            for(String page:new String[]{"shop","collection","arena","prestige","achievements","statistics","rewards","settings"}) {
                js(scenario,"document.querySelector('a[href$=\""+page+".html\"]').click()");
                Thread.sleep(600);ready(scenario);
                assertEquals("\""+page+"\"",js(scenario,"document.body.dataset.page"));
                if (page.equals("shop")) {
                    scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
                    Thread.sleep(800); ready(scenario);
                    assertEquals("\"home\"", js(scenario,"document.body.dataset.page"));
                    js(scenario,"document.querySelector('a[href$=\"shop.html\"]').click()");
                    Thread.sleep(600); ready(scenario);
                }
            }
            js(scenario,"document.querySelector('a[href$=\"index.html\"]').click()");
            Thread.sleep(600); ready(scenario);
            js(scenario,"document.getElementById('lollipop').click()");
            scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);
            Thread.sleep(600);
            scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);
            ready(scenario);
            assertTrue(Integer.parseInt(js(scenario,"JSON.parse(localStorage.getItem('lollipopSave')).totalClicks"))>=2);
        }
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            ready(scenario);
            assertTrue(Integer.parseInt(js(scenario,"JSON.parse(localStorage.getItem('lollipopSave')).totalClicks"))>=1);
        }
    }
}
