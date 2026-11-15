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
  String exportDir="/data/local/tmp/fasttrip-store-"+instrumentation.getTargetContext().getPackageName();
  ParcelFileDescriptor[] pipe=instrumentation.getUiAutomation().executeShellCommandRw("mkdir -p "+exportDir+" && cat > "+exportDir+"/"+name+".png && echo SAVED");
  try(ParcelFileDescriptor.AutoCloseOutputStream output=new ParcelFileDescriptor.AutoCloseOutputStream(pipe[1])){assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,output));}
  bitmap.recycle();
  java.io.ByteArrayOutputStream result=new java.io.ByteArrayOutputStream();
  try(ParcelFileDescriptor.AutoCloseInputStream input=new ParcelFileDescriptor.AutoCloseInputStream(pipe[0])){byte[] buffer=new byte[1024];int count;while((count=input.read(buffer))!=-1)result.write(buffer,0,count);}
  assertTrue("Screenshot export failed",result.toString("UTF-8").contains("SAVED"));
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
