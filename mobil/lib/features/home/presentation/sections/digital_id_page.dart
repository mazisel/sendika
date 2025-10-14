import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../widgets/member_qr_card.dart';
import '../../../auth/application/auth_controller.dart';

class DigitalIdPage extends ConsumerWidget {
  const DigitalIdPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final member = authState.member;

    if (member == null) {
      return const Center(
        child: Text('Üye bilgileri bulunamadı. Lütfen yeniden giriş yapın.'),
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 24),
      children: [
        MemberQrCard(member: member),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: FilledButton.icon(
            onPressed: () =>
                ref.read(authControllerProvider.notifier).refreshMember(),
            icon: const Icon(Icons.refresh),
            label: const Text('Bilgileri Güncelle'),
          ),
        ),
        const SizedBox(height: 24),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Dijital Kimlik Hakkında',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'QR kod, sendika görevlileri tarafından kimlik doğrulama '
                    'işlemlerinde kullanılmak üzere hazırlanmıştır. Kod, üyelik '
                    'bilgilerinizi güvenli bir biçimde temsil eder.',
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Bilgilerinizde değişiklik olması durumunda güncel halini '
                    'görüntülemek için yukarıdaki "Bilgileri Güncelle" butonunu kullanabilirsiniz.',
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
