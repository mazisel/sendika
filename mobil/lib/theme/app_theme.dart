import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static const _primaryColor = Color(0xFF5B8CFF);
  static const _surfaceColor = Color(0xFF10131A);
  static const _cardColor = Color(0xFF1A1F2A);

  static ThemeData dark() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _primaryColor,
      brightness: Brightness.dark,
    );

    final base = ThemeData(
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      useMaterial3: true,
    );

    return base.copyWith(
      scaffoldBackgroundColor: _surfaceColor,
      appBarTheme: base.appBarTheme.copyWith(
        backgroundColor: Colors.transparent,
        elevation: 0,
        titleTextStyle: base.textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
      cardColor: _cardColor,
      canvasColor: _surfaceColor,
      navigationBarTheme: base.navigationBarTheme.copyWith(
        backgroundColor: _cardColor,
        indicatorColor: _primaryColor.withValues(alpha: 0.18),
        labelTextStyle: WidgetStatePropertyAll(
          base.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
      dialogTheme: base.dialogTheme.copyWith(
        backgroundColor: _cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      snackBarTheme: base.snackBarTheme.copyWith(
        backgroundColor: _cardColor,
        contentTextStyle: base.textTheme.bodyMedium,
        behavior: SnackBarBehavior.floating,
      ),
      inputDecorationTheme: base.inputDecorationTheme.copyWith(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.04),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        hintStyle: base.textTheme.bodyMedium?.copyWith(
          color: Colors.white.withValues(alpha: 0.45),
        ),
      ),
      textTheme: base.textTheme.apply(
        fontFamily: 'Roboto',
        bodyColor: Colors.white,
        displayColor: Colors.white,
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: _primaryColor.withValues(alpha: 0.16),
        labelStyle: base.textTheme.bodySmall?.copyWith(
          color: _primaryColor,
          fontWeight: FontWeight.w600,
        ),
      ),
      dividerTheme: const DividerThemeData(color: Colors.white24),
      splashColor: _primaryColor.withValues(alpha: 0.12),
      highlightColor: Colors.transparent,
    );
  }
}
