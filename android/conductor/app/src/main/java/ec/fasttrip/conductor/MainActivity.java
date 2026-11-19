package ec.fasttrip.conductor;
import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.widget.Toast;
public class MainActivity extends Activity {
 private WebView web;
 private GeolocationPermissions.Callback locationCallback;
 private String locationOrigin;
 private boolean trusted(Uri uri){return "https".equals(uri.getScheme())&&"ricardo45530.github.io".equals(uri.getHost())&&uri.getPath()!=null&&uri.getPath().startsWith("/fast-trip/conductor/");}

 private boolean openExternal(Uri uri, String packageName) {
  Intent intent = new Intent(Intent.ACTION_VIEW, uri);
  if (packageName != null) intent.setPackage(packageName);
  try {
   startActivity(intent);
   return true;
  } catch (ActivityNotFoundException | SecurityException ignored) {
   return false;
  }
 }

 private boolean navigate(Uri uri) {
  if (trusted(uri)) return false;

  String scheme = uri.getScheme();
  if (("https".equals(scheme) || "intent".equals(scheme))
      && "www.google.com".equals(uri.getEncodedAuthority())
      && "/maps/dir/".equals(uri.getEncodedPath())
      && "1".equals(uri.getQueryParameter("api"))) {
   // Only reuse the Maps directions query. Ignore any intent fragment or extras.
   Uri mapsUrl = uri.buildUpon().scheme("https").fragment(null).build();
   if (!openExternal(mapsUrl, "com.google.android.apps.maps") && !openExternal(mapsUrl, null)) {
    Toast.makeText(this, "No se encontró una aplicación para abrir Google Maps.", Toast.LENGTH_LONG).show();
   }
   return true;
  }
  if ("https".equals(scheme) || "tel".equals(scheme)) openExternal(uri, null);
  return true;
 }

 @Override public void onCreate(Bundle state){
  super.onCreate(state);web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setGeolocationEnabled(true);web.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);web.getSettings().setAllowFileAccess(false);web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
    return request.isForMainFrame() && navigate(request.getUrl());
   }

   @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
    return navigate(Uri.parse(url));
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
    if(!"https://ricardo45530.github.io".equals(origin.replaceAll("/$",""))||!trusted(Uri.parse(web.getUrl()==null?"":web.getUrl()))){callback.invoke(origin,false,false);return;}
    if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED){callback.invoke(origin,true,false);return;}
    if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);locationOrigin=origin;locationCallback=callback;requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},40);
   }
  });
  setContentView(web);web.loadUrl("https://ricardo45530.github.io/fast-trip/conductor/");
 }
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request==40&&locationCallback!=null){boolean allowed=false;for(int result:results)if(result==PackageManager.PERMISSION_GRANTED)allowed=true;locationCallback.invoke(locationOrigin,allowed,false);locationCallback=null;locationOrigin=null;}}
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);if(web!=null)web.destroy();super.onDestroy();}
}
