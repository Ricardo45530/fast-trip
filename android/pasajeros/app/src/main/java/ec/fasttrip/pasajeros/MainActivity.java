package ec.fasttrip.pasajeros;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
public class MainActivity extends Activity {
 private WebView web;
 @Override public void onCreate(Bundle state){super.onCreate(state);web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.setWebViewClient(new WebViewClient());web.setWebChromeClient(new WebChromeClient());setContentView(web);web.loadUrl("https://ricardo45530.github.io/fast-trip/pasajeros/");}
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
