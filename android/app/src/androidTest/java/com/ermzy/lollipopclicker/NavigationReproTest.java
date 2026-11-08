package com.ermzy.lollipopclicker;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Focused diagnostic only; the mandatory GameOfflineTest scenarios are unchanged. */
@RunWith(AndroidJUnit4.class)
public class NavigationReproTest extends WebViewSmokeSupport {
    @Test public void homeShopHome() throws Exception {
        mark("focused home shop home");
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            ready(scenario,"home");navigate(scenario,"shop");navigate(scenario,"home");
        }
    }
}
