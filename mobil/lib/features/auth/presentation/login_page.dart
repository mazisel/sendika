import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/auth_controller.dart';
import '../application/auth_state.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _tcController = TextEditingController();
  final _passwordController = TextEditingController();
  late final ProviderSubscription<AuthState> _authSubscription;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _authSubscription = ref.listenManual<AuthState>(authControllerProvider, (
      previous,
      next,
    ) {
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }, fireImmediately: false);
  }

  @override
  void dispose() {
    _authSubscription.close();
    _tcController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _onSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    await ref
        .read(authControllerProvider.notifier)
        .login(
          tcIdentity: _tcController.text.trim(),
          password: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _LoginHeader(),
                  const SizedBox(height: 32),
                  Card(
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _tcController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'TC Kimlik Numarası',
                                hintText: '11 haneli TC kimlik numaranız',
                                prefixIcon: Icon(Icons.badge_outlined),
                              ),
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(11),
                              ],
                              validator: (value) {
                                final trimmed = value?.trim() ?? '';
                                if (trimmed.length != 11) {
                                  return 'TC Kimlik numarası 11 haneli olmalıdır.';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              decoration: InputDecoration(
                                labelText: 'Şifre',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  onPressed: () => setState(
                                    () => _obscurePassword = !_obscurePassword,
                                  ),
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                  ),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Şifrenizi giriniz.';
                                }
                                if (value.length < 6) {
                                  return 'Şifreniz en az 6 karakter olmalıdır.';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Kayıt işlemleri sendika yönetimi tarafından yapılmaktadır.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                            const SizedBox(height: 24),
                            FilledButton(
                              onPressed: authState.isLoading
                                  ? null
                                  : () => _onSubmit(),
                              style: FilledButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                              ),
                              child: authState.isLoading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation(
                                          Colors.white,
                                        ),
                                      ),
                                    )
                                  : const Text(
                                      'Giriş Yap',
                                      style: TextStyle(fontSize: 16),
                                    ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const _SupportInfo(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoginHeader extends StatelessWidget {
  const _LoginHeader();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Icon(Icons.shield_outlined, size: 64, color: colorScheme.primary),
        const SizedBox(height: 12),
        Text(
          'Ulaştırma Kamu Çalışanları Sendikası',
          textAlign: TextAlign.center,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          'Üye portalına giriş yaparak duyurulara ulaşın,\n'
          'dijital üye kimliğinizi görüntüleyin.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _SupportInfo extends StatelessWidget {
  const _SupportInfo();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          'Şifrenizi bilmiyorsanız lütfen şubenizle iletişime geçin.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        Text(
          'Yeni kayıt işlemleri yönetici paneli üzerinden yapılacaktır.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
