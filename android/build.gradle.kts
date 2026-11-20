// Raíz del proyecto de la app (TK-04). Los plugins se declaran acá y se aplican en :app.
// kotlin-android no se aplica (AGP 9 trae Kotlin incorporado): se declara solo para fijar la versión de Kotlin.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.google.services) apply false
    alias(libs.plugins.spotless)
}

// ktlint por Spotless: lo usan la CI (spotlessCheck) y el hook ktlint-formato (spotlessApply -PspotlessIdeHook).
spotless {
    kotlin {
        target("app/src/**/*.kt")
        ktlint(libs.versions.ktlint.get())
    }
    kotlinGradle {
        target("*.gradle.kts", "app/*.gradle.kts")
        ktlint(libs.versions.ktlint.get())
    }
}
