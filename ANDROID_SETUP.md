# دليل تحويل التطبيق إلى APK (أندرويد)

هذا الملف يحتوي على الخطوات الكاملة لتحويل موقع "اجتماع يوسف الصديق" إلى تطبيق موبايل يعمل على الأندرويد باستخدام Capacitor.

---

## 1. المتطلبات الأساسية
تأكد من تثبيت البرامج التالية على جهازك:
* **Node.js**: (أحدث نسخة مستقرة).
* **Android Studio**: (لإصدار ملف الـ APK النهائي).

---

## 2. تثبيت المكتبات وتشغيل البناء
افتح التيرمينال (Terminal) داخل مجلد المشروع ونفذ الأوامر التالية بالترتيب:

### أ. تثبيت المكتبات الأساسية (هام جداً لإصلاح أخطاء البناء)
يجب تثبيت مكتبات React والأدوات المستخدمة في التطبيق لتجنب أخطاء "Could not resolve":

```bash
npm install react react-dom lucide-react recharts xlsx @google/genai react-qr-code canvas-confetti
```

### ب. تثبيت تعريفات Typescript (اختياري لكن مفيد لتجنب الأخطاء)
```bash
npm install --save-dev @types/react @types/react-dom @types/canvas-confetti
```

### ج. تثبيت مكتبات Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### د. بناء المشروع (Build)
هذا الأمر يقوم بتحويل كود React إلى ملفات جاهزة للنشر:
```bash
npm run build
```
*(ملاحظة: تأكد أن هذا الأمر يُنتج مجلد اسمه `dist`. إذا كان اسم المجلد `build`، قم بتعديل `webDir` في ملف `capacitor.config.ts`)*.

---

## 3. إعداد بيئة الأندرويد

### أ. إنشاء مشروع الأندرويد
```bash
npx cap add android
```

### ب. مزامنة الملفات
```bash
npx cap sync
```

---

## 4. ضبط الصلاحيات (هام جداً)
بما أن التطبيق يستخدم **الكاميرا** (للحضور) و **الميكروفون** (للمساعد الذكي)، يجب تفعيل هذه الصلاحيات يدوياً.

1. اذهب إلى المسار: `android/app/src/main/AndroidManifest.xml`
2. افتح الملف وأضف الأكواد التالية **مباشرة قبل** وسم `<application>`:

```xml
<!-- صلاحيات الإنترنت -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- صلاحيات الكاميرا (لمسح الباركود وبصمة الوجه) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" />
<uses-feature android:name="android.hardware.camera.autofocus" />

<!-- صلاحيات الميكروفون (للمساعد الصوتي Live API) -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

---

## 5. تشغيل التطبيق واستخراج APK

1. افتح المشروع داخل Android Studio بالأمر:
```bash
npx cap open android
```

2. انتظر حتى ينتهي Android Studio من تحميل المكتبات (Gradle Sync).

3. **لتجربة التطبيق على هاتفك:**
   * قم بتوصيل هاتفك بالكمبيوتر عبر USB (مع تفعيل USB Debugging).
   * اضغط على زر التشغيل (المثلث الأخضر ▶) في الشريط العلوي.

4. **لاستخراج ملف APK للنشر:**
   * من القائمة العلوية اختر: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   * عند الانتهاء، ستظهر رسالة في الأسفل. اضغط على **locate** لفتح المجلد الذي يحتوي على ملف التطبيق.

---

## مشاكل شائعة وحلولها

* **المشكلة:** `Could not resolve ...` أثناء البناء.
  * **الحل:** تأكد من تنفيذ الأمر في الخطوة 2أ لتثبيت كافة المكتبات (`lucide-react` وغيرها).

* **المشكلة:** التطبيق يظهر شاشة بيضاء.
  * **الحل:** تأكد من أنك قمت بتنفيذ `npm run build` قبل `npx cap sync`. وتأكد أن `webDir` في `capacitor.config.ts` يطابق اسم مجلد البناء (`dist` أو `build`).
