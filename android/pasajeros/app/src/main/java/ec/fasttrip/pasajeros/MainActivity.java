package ec.fasttrip.pasajeros;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.WindowInsets;
import android.window.OnBackInvokedDispatcher;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
 private static final String HOME="https://ricardo45530.github.io/fast-trip/pasajeros/";
 private WebView web;
 private GeolocationPermissions.Callback locationCallback;
 private String locationOrigin;
 private PermissionRequest cameraRequest;
 private boolean trusted(Uri uri){return "https".equals(uri.getScheme()) && "ricardo45530.github.io".equals(uri.getHost()) && uri.getPath()!=null && uri.getPath().startsWith("/fast-trip/pasajeros/");}
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  getWindow().setStatusBarColor(0xff090b0d);getWindow().setNavigationBarColor(0xff090b0d);
  web=new WebView(this);WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setGeolocationEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setCacheMode(WebSettings.LOAD_DEFAULT);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return navigate(request.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView view,String url){return navigate(Uri.parse(url));}
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){
    if(request.isForMainFrame()){view.loadDataWithBaseURL(null,"<html lang='es'><meta name='viewport' content='width=device-width,initial-scale=1'><body style='background:#090b0d;color:#e8c477;font:18px sans-serif;padding:36px'><h2>FAST TRIP</h2><p>No se pudo conectar. Revisa tu señal y vuelve a intentar.</p><a style='color:#e8c477' href='"+HOME+"'>Volver a intentar</a></body></html>","text/html","UTF-8",null);}
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->{
    if(!trusted(Uri.parse(web.getUrl()==null?"":web.getUrl())) || !"https://ricardo45530.github.io".equals(request.getOrigin().toString().replaceAll("/$",""))){request.deny();return;}
    boolean video=false;for(String resource:request.getResources())if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource))video=true;
    if(!video){request.deny();return;}
    if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED){request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});return;}
    if(cameraRequest!=null)cameraRequest.deny();cameraRequest=request;requestPermissions(new String[]{Manifest.permission.CAMERA},41);
   });}
   @Override public void onPermissionRequestCanceled(PermissionRequest request){if(cameraRequest==request)cameraRequest=null;}

   @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
    if(!"https://ricardo45530.github.io".equals(origin) && !"https://ricardo45530.github.io/".equals(origin)){callback.invoke(origin,false,false);return;}
    if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED){callback.invoke(origin,true,false);return;}
    if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);
    locationOrigin=origin;locationCallback=callback;
    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},40);
   }
  });
  if(Build.VERSION.SDK_INT>=30){
   getWindow().setDecorFitsSystemWindows(false);
   web.setOnApplyWindowInsetsListener((view,insets)->{
    android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
    view.setPadding(bars.left,bars.top,bars.right,bars.bottom);
    return insets;
   });
  }
  if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
  setContentView(web);web.requestApplyInsets();web.loadUrl(HOME);
 }
 private boolean navigate(Uri uri){
  if(trusted(uri))return false;
  String scheme=uri.getScheme();
  if("https".equals(scheme)||"mailto".equals(scheme)||"tel".equals(scheme)){
   try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException e){Toast.makeText(this,"No hay una aplicación disponible para abrir este enlace.",Toast.LENGTH_LONG).show();}
  }
  return true;
 }
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){
  super.onRequestPermissionsResult(request,permissions,results);
  if(request==41 && cameraRequest!=null){if(results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED)cameraRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else cameraRequest.deny();cameraRequest=null;}
  if(request==40 && locationCallback!=null){boolean allowed=false;for(int result:results)if(result==PackageManager.PERMISSION_GRANTED)allowed=true;locationCallback.invoke(locationOrigin,allowed,false);locationCallback=null;locationOrigin=null;}
 }
 @Override public void onBackPressed(){handleBack();}
 private void handleBack(){
  web.evaluateJavascript("(function(){var d=document.getElementById('actionDialog');if(d&&d.open){d.close();return true;}if(typeof activeScreen!=='undefined' && activeScreen!=='welcome' && activeScreen!=='reset'){screen('welcome');return true;}return false;})()",result->{if(!"true".equals(result)){if(web.canGoBack())web.goBack();else finish();}});
 }
 @Override protected void onResume(){super.onResume();if(web!=null)web.evaluateJavascript("if(typeof currentUser!=='undefined' && currentUser && typeof loadTrips==='function')loadTrips();",null);}
 @Override protected void onPause(){if(web!=null)web.evaluateJavascript("if(typeof passengerFlow!=='undefined')passengerFlow.stopCamera();",null);super.onPause();}
 @Override protected void onDestroy(){if(cameraRequest!=null)cameraRequest.deny();if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
