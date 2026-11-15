package ec.fasttrip.pasajeros;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.os.ParcelFileDescriptor;
import java.io.FileInputStream;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Captures the real Android WebView without accounts, fixtures or submitted forms. */
@RunWith(AndroidJUnit4.class)
public class StoreScreenshotsTest {
 private Instrumentation instrumentation;
 private Activity activity;
 private WebView web;
 private WebView findWeb(View view) {
  if(view instanceof WebView) return (WebView)view;
  if(view instanceof ViewGroup) {
   ViewGroup group=(ViewGroup)view;
   for(int i=0;i<group.getChildCount();i++){WebView found=findWeb(group.getChildAt(i));if(found!=null)return found;}
  }
  return null;
 }
 private String js(String expression) throws Exception {
  CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
  instrumentation.runOnMainSync(()->web.evaluateJavascript(expression,value->{result.set(value);latch.countDown();}));
  assertTrue("JavaScript callback",latch.await(10,TimeUnit.SECONDS));return result.get();
 }
 private void waitFor(String expression) throws Exception {
  for(int i=0;i<120;i++){if("true".equals(js(expression)))return;SystemClock.sleep(500);}
  fail("App screen did not become ready: "+expression);
 }
 private void capture(String name) throws Exception {
  instrumentation.waitForIdleSync();SystemClock.sleep(1200);
  Bitmap bitmap=instrumentation.getUiAutomation().takeScreenshot();assertNotNull(bitmap);
  File directory=new File(instrumentation.getTargetContext().getExternalFilesDir(null),"store-screenshots");assertTrue(directory.isDirectory()||directory.mkdirs());
  File screenshotFile=new File(directory,name+".png");
  try(FileOutputStream out=new FileOutputStream(screenshotFile)){assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,out));}
  bitmap.recycle();
  String exportDir="/sdcard/Download/fasttrip-store-"+instrumentation.getTargetContext().getPackageName();
  try(ParcelFileDescriptor fd=instrumentation.getUiAutomation().executeShellCommand("mkdir -p "+exportDir+" && cp "+screenshotFile.getAbsolutePath()+" "+exportDir+"/");FileInputStream input=new FileInputStream(fd.getFileDescriptor())){byte[] buffer=new byte[1024];while(input.read(buffer)!=-1){}}
 }
 @Test public void capturePublicScreens() throws Exception {
  instrumentation=InstrumentationRegistry.getInstrumentation();
  Intent intent=new Intent(instrumentation.getTargetContext(),MainActivity.class);intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  activity=instrumentation.startActivitySync(intent);
  instrumentation.runOnMainSync(()->web=findWeb(activity.getWindow().getDecorView()));assertNotNull(web);
  waitFor("document.readyState === 'complete' && !!window.supabase && !!document.getElementById('startBtn')");
  waitFor("!document.getElementById('welcome').classList.contains('hidden')");
  capture("01-welcome");
  js("document.getElementById('startBtn').click();true");
  waitFor("!document.getElementById('access').classList.contains('hidden')");
  capture("02-access");
  instrumentation.runOnMainSync(()->activity.finish());
 }
}
