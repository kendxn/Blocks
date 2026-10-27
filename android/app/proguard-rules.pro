# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# -------------------------------------------------------------
# Google Play Deobfuscation & Stack Traces
# -------------------------------------------------------------
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-keepattributes JavascriptInterface
-renamesourcefileattribute SourceFile

# -------------------------------------------------------------
# Capacitor Core & Plugin Bridge
# -------------------------------------------------------------
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# Preserve all Capacitor plugin classes and methods
-keep public class * extends com.getcapacitor.Plugin {
    public <methods>;
}

# Preserve Capacitor plugin annotations
-keep @interface com.getcapacitor.annotation.CapacitorPlugin { *; }
-keep @interface com.getcapacitor.annotation.Permission { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep @interface com.getcapacitor.NativePlugin { *; }

-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
}

# Preserve WebView JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# -------------------------------------------------------------
# Cordova Compatibility
# -------------------------------------------------------------
-keep public class * extends org.apache.cordova.CordovaPlugin {
    public <methods>;
}
-keep class org.apache.cordova.** { *; }

# -------------------------------------------------------------
# Google AdMob & Play Services Ads
# -------------------------------------------------------------
-keep public class com.google.android.gms.ads.** {
    public *;
}
-keep public class com.google.ads.** {
    public *;
}
-keep class com.getcapacitor.community.admob.** { *; }
