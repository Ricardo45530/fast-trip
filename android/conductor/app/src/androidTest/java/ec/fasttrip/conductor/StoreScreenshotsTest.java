package ec.fasttrip.conductor;

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
 private String shell(String command) throws Exception {
  ParcelFileDescriptor pipe=instrumentation.getUiAutomation().executeShellCommand(command);
  java.io.ByteArrayOutputStream result=new java.io.ByteArrayOutputStream();
  try(ParcelFileDescriptor.AutoCloseInputStream input=new ParcelFileDescriptor.AutoCloseInputStream(pipe)){
   byte[] buffer=new byte[1024];int count;
   while((count=input.read(buffer))!=-1)result.write(buffer,0,count);
  }
  return result.toString("UTF-8");
 }
 private void capture(String name) throws Exception {
  instrumentation.waitForIdleSync();SystemClock.sleep(1200);
  String exportDir="/data/local/tmp/fasttrip-store-"+instrumentation.getTargetContext().getPackageName();
  // UiAutomation executes a command directly, without a shell to interpret &&.
  shell("mkdir -p "+exportDir);
  String path=exportDir+"/"+name+".png";
  shell("screencap -p "+path);
  String size=shell("stat -c %s "+path).trim();
  assertTrue("Screenshot export failed; size="+size,size.matches("[0-9]+") && Long.parseLong(size)>1024);
 }
 @Test public void capturePublicScreens() throws Exception {
  instrumentation=InstrumentationRegistry.getInstrumentation();
  Intent intent=new Intent(instrumentation.getTargetContext(),MainActivity.class);intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  activity=instrumentation.startActivitySync(intent);
  instrumentation.runOnMainSync(()->web=findWeb(activity.getWindow().getDecorView()));assertNotNull(web);
  waitFor("document.readyState === 'complete' && !!window.supabase && !!document.getElementById('loginForm')");
  waitFor("!document.getElementById('access').classList.contains('hidden')");
  capture("01-access");
  js("document.getElementById('registerLink').click();true");
  waitFor("!document.getElementById('register').classList.contains('hidden')");
  capture("02-register");
  instrumentation.runOnMainSync(()->activity.finish());
 }
}
