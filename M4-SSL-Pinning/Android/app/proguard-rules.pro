# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

#
# Based on app/build/putput/mapping/release/missing_rules.txt:
#

-keepclassmembers class android.content.pm.PackageManager {
   public *;
}

-keepclassmembers class kotlin.jvm.internal.SourceDebugExtension {
   public *;
}

# Please add these rules to your existing keep rules in order to suppress warnings.
# This is generated automatically by the Android Gradle plugin.
-dontwarn android.content.pm.PackageManager$ApplicationInfoFlags
-dontwarn android.content.pm.PackageManager$PackageInfoFlags
-dontwarn kotlin.jvm.internal.SourceDebugExtension