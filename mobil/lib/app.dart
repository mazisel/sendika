import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'features/auth/application/auth_controller.dart';
import 'features/auth/presentation/login_page.dart';
import 'features/home/presentation/home_shell.dart';

class SendikaApp extends ConsumerWidget {
  const SendikaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);

    return MaterialApp(
      title: 'Ulaştırma Kamu Çalışanları Sendikası',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF1D4ED8),
        scaffoldBackgroundColor: const Color(0xFFF5F6FA),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: Builder(
        builder: (context) {
          if (!authState.initialized) {
            return const _SplashView();
          }

          if (authState.member == null) {
            return const LoginPage();
          }

          return const HomeShell();
        },
      ),
    );
  }
}

class _SplashView extends StatelessWidget {
  const _SplashView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text(
              'Uygulama hazırlanıyor...',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}
