// Módulo de la app (TK-04). Variantes, URL base y configuración de Firebase: design D2, D3 y D9 del change tk-04-app-base.
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

// google-services.json es local y no se versiona (DP-89). Sin él (la CI) la app compila, y el inicio de sesión
// falla con un motivo explícito porque Firebase no se inicializa.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// -PurlBase=… reemplaza la URL base de la variante que se compila (DP-90): la usa la prueba de SEG-c7.
val urlBase: String? = providers.gradleProperty("urlBase").orNull

fun comillas(valor: String) = "\"$valor\""

android {
    namespace = "com.tabbie.waiter"
    compileSdk = 35

    defaultConfig {
        // El mismo en las tres variantes: la app se registra una sola vez en Firebase (DP-88).
        applicationId = "com.tabbie.waiter"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        // La cuenta de prueba de androidTest/ sale del entorno, nunca del código (DP-93).
        testInstrumentationRunnerArguments["emailMozo"] =
            providers.environmentVariable(
                "EMAIL_MOZO1_R1"
            ).orElse("waiterapp.mozo1.r1@example.com").get()
        providers.environmentVariable("CONTRASENA_MOZO1_R1").orNull?.let {
            testInstrumentationRunnerArguments["contrasenaMozo"] = it
        }
    }

    flavorDimensions += "entorno"
    productFlavors {
        create("local") {
            dimension = "entorno"
            buildConfigField("String", "URL_BASE", comillas(urlBase ?: "http://10.0.2.2:3000/"))
        }
        create("demo") {
            dimension = "entorno"
            // Hueco: la réplica de demo en Railway todavía no existe (DP-90).
            buildConfigField(
                "String",
                "URL_BASE",
                comillas(urlBase ?: "https://replica-demo.invalid/")
            )
        }
        create("tabbie") {
            dimension = "entorno"
            // Hueco: la URL del backend real no está en ningún documento (DP-90).
            buildConfigField("String", "URL_BASE", comillas(urlBase ?: "https://tabbie.invalid/"))
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.viewmodel.compose)

    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth)

    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.coroutines.play.services)

    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)

    testImplementation(platform(libs.compose.bom))
    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.turbine)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(libs.robolectric)
    testImplementation(libs.compose.ui.test.junit4)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.androidx.test.ext.junit)

    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.test.core)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.ext.junit)
}
