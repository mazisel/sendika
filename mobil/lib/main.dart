import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: '.env');

  final supabaseUrl = dotenv.env['SUPABASE_URL'];
  final supabaseAnonKey = dotenv.env['SUPABASE_ANON_KEY'];

  if (supabaseUrl == null ||
      supabaseUrl.isEmpty ||
      supabaseAnonKey == null ||
      supabaseAnonKey.isEmpty) {
    FlutterError.presentError(
      FlutterErrorDetails(
        exception:
            'Supabase yapılandırması eksik. Lütfen .env dosyasında SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini tanımlayın.',
      ),
    );
    return;
  }

  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    debug: false,
  );

  runApp(const ProviderScope(child: SendikaApp()));
}
