package com.ermzy.lollipopclicker;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BetaFiles")
public class BetaFilesPlugin extends Plugin {
    @PluginMethod public void exportSave(PluginCall call) {
        String content = call.getString("content");
        if (content == null || content.length() > 2000000) { call.reject("Save inválido."); return; }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "lollipop-save.json"));
        startActivityForResult(call, intent, "exportResult");
    }
    @ActivityCallback private void exportResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.resolve(); return; }
        Uri uri = result.getData().getData();
        if (uri == null) { call.reject("Destino indisponível."); return; }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri)) {
            if (stream == null) throw new IllegalStateException("Arquivo indisponível.");
            stream.write(call.getString("content", "").getBytes(StandardCharsets.UTF_8));
            call.resolve(new JSObject().put("saved", true));
        } catch (Exception error) { call.reject("Não foi possível guardar o backup."); }
    }
    @PluginMethod public void openReport(PluginCall call) {
        String body = "Versão: 3.0.0-beta.1\nAndroid: " + android.os.Build.VERSION.RELEASE + "\n\nO que aconteceu?\n\nComo reproduzir?\n\nResultado esperado?\n";
        Uri uri = Uri.parse("https://github.com/Erm-Zy/Lollipop-Clicker-TEST/issues/new?title=" + Uri.encode("[Android beta] ") + "&body=" + Uri.encode(body));
        try { getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri)); call.resolve(); }
        catch (Exception e) { call.reject("Abra o repositório no navegador para relatar o problema."); }
    }
}
