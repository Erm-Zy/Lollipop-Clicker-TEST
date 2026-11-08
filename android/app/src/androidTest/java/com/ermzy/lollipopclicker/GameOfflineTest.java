package com.ermzy.lollipopclicker;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import androidx.lifecycle.Lifecycle;
import android.os.SystemClock;
import android.util.Log;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicBoolean;

/** Tests own a disposable emulator sandbox, never a tester's installed save. */
class WebViewSmokeSupport {
    protected static final String TAG = "LollipopSmoke";
    protected String stage = "launch", lastSnapshot = "no callback yet";

    protected JSONObject js(ActivityScenario<MainActivity> scenario, String code) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        String wrapped = "(()=>{try{return {ok:true,value:(()=>{" + code + "})()}}catch(e){return {ok:false,error:String(e.name)+': '+String(e.message)}}})()";
        scenario.onActivity(activity -> {
            if (activity.getBridge() == null || activity.getBridge().getWebView() == null) {
                result.set("{\"ok\":false,\"error\":\"native WebView unavailable\"}"); latch.countDown();
            } else activity.getBridge().getWebView().evaluateJavascript(wrapped, value -> { result.set(value); latch.countDown(); });
        });
        assertTrue(stage + ": JS callback timed out; " + lastSnapshot, latch.await(5, TimeUnit.SECONDS));
        assertNotNull(stage + ": null WebView result", result.get());
        JSONObject envelope = new JSONObject(result.get());
        assertTrue(stage + ": script threw: " + envelope.optString("error"), envelope.optBoolean("ok"));
        return envelope;
    }
    protected void mark(String label) { stage = label; Log.i(TAG, "STAGE " + label); }
    protected void ready(ActivityScenario<MainActivity> scenario, String page) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 30000;
        while (SystemClock.elapsedRealtime() < deadline) {
            AtomicBoolean available = new AtomicBoolean();
            scenario.onActivity(activity -> available.set(activity.getBridge() != null && activity.getBridge().getWebView() != null));
            if (!available.get()) { lastSnapshot = "native WebView not created yet"; SystemClock.sleep(100); continue; }
            JSONObject state = js(scenario, "return {page:document.body?.dataset.page||'',readonly:document.body?.dataset.readonly||'',loaded:document.readyState,path:location.pathname,header:!!document.getElementById('saveStatus'),status:document.getElementById('saveStatus')?.textContent||''}").getJSONObject("value");
            lastSnapshot = state.toString(); // No currency, save contents or player identifiers.
            if (page.equals(state.optString("page")) && "false".equals(state.optString("readonly")) && "complete".equals(state.optString("loaded")) && state.optBoolean("header")) {
                Log.i(TAG, "READY " + lastSnapshot); return;
            }
            SystemClock.sleep(100);
        }
        fail(stage + ": expected writable completed document " + page + "; last " + lastSnapshot);
    }
    protected void navigate(ActivityScenario<MainActivity> scenario, String page) throws Exception {
        mark("navigate " + page);
        String suffix = page.equals("home") ? "index.html" : page + ".html";
        navigationSnapshot(scenario,"before " + page);
        // Open the visible More menu when necessary, rather than click hidden links.
        js(scenario, "const links=[...document.querySelectorAll('nav a')];const a=links.find(a=>a.getAttribute('href')?.endsWith('"+suffix+"')&&a.getClientRects().length);if(!a){const menu=[...document.querySelectorAll('.more-menu')].find(m=>m.getClientRects().length);if(!menu)throw Error('visible More selector missing');menu.open=true;}return true;");
        js(scenario, "const a=[...document.querySelectorAll('nav a')].find(a=>a.getAttribute('href')?.endsWith('"+suffix+"')&&a.getClientRects().length);if(!a)throw Error('navigation anchor missing: "+page+"');if(a.getAttribute('aria-disabled')==='true')throw Error('navigation disabled');a.click();return true;");
        ready(scenario,page);
        navigationSnapshot(scenario,"after " + page);
    }
    protected void navigationSnapshot(ActivityScenario<MainActivity> scenario, String label) throws Exception {
        scenario.onActivity(activity -> Log.i(TAG,"NAV " + label + " wall_ms=" + System.currentTimeMillis()
            + " activity=" + System.identityHashCode(activity) + " webview=" + System.identityHashCode(activity.getBridge().getWebView())));
        Log.i(TAG,"DOCUMENT " + label + " " + js(scenario,"return {page:document.body?.dataset.page||'',path:location.pathname,loaded:document.readyState,timeOrigin:performance.timeOrigin}").getJSONObject("value"));
    }
    protected void click(ActivityScenario<MainActivity> scenario) throws Exception {
        js(scenario,"const b=document.getElementById('lollipop');if(!b)throw Error('lollipop selector missing');if(b.disabled)throw Error('lollipop disabled');b.click();return true;");
    }
    protected long savedClicks(ActivityScenario<MainActivity> scenario) throws Exception {
        return js(scenario,"const raw=localStorage.getItem('lollipopSave');if(!raw)throw Error('persistent save missing');const n=JSON.parse(raw).totalClicks;if(!Number.isSafeInteger(n))throw Error('invalid persistent click count');return n;").getLong("value");
    }
    protected void waitSaved(ActivityScenario<MainActivity> scenario, long expected) throws Exception {
        long deadline=SystemClock.elapsedRealtime()+10000;
        while(SystemClock.elapsedRealtime()<deadline) {
            if(savedClicks(scenario)==expected)return;
            SystemClock.sleep(100);
        }
        fail(stage+": persistent totalClicks differs from expected delta");
    }
}

@RunWith(AndroidJUnit4.class)
public class GameOfflineTest extends WebViewSmokeSupport {
    @Test public void offlineBundledNavigation() throws Exception {
        mark("offline navigation launch");
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            ready(scenario,"home");
            for(String page:new String[]{"shop","collection","pets","arena","prestige","achievements","statistics","rewards","settings","home"})navigate(scenario,page);
        }
    }
    @Test public void androidBackReturnsToPreviousDocument() throws Exception {
        mark("back launch");
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            ready(scenario,"home");navigate(scenario,"shop");mark("native Back shop to home");
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            ready(scenario,"home");
        }
    }
    @Test public void lifecycleAndActivityRelaunchRetainExactClickDelta() throws Exception {
        long expected;
        mark("persistence launch");
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            ready(scenario,"home");long before=savedClicks(scenario);click(scenario);
            // Document navigation must flush, not just leave the value in memory.
            navigate(scenario,"shop");expected=before+1;waitSaved(scenario,expected);
            navigate(scenario,"home");click(scenario);expected++;
            mark("background and resume");scenario.moveToState(Lifecycle.State.CREATED);scenario.moveToState(Lifecycle.State.RESUMED);
            ready(scenario,"home");waitSaved(scenario,expected);
        }
        mark("new Activity launch (not process-death simulation)");
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            ready(scenario,"home");assertEquals(stage+": disk save changed",expected,savedClicks(scenario));
        }
    }
}
