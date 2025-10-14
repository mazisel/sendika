import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../features/auth/domain/member.dart';

class MemberQrCard extends StatelessWidget {
  const MemberQrCard({super.key, required this.member});

  final Member member;

  @override
  Widget build(BuildContext context) {
    final qrPayload = jsonEncode({
      'id': member.id,
      'membership_number': member.membershipNumber,
      'full_name': member.fullName,
      'tc_identity': member.tcIdentity,
      'timestamp': DateTime.now().toIso8601String(),
    });

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              member.fullName,
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Üyelik No: ${member.membershipNumber}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: Colors.blueGrey.shade50,
              ),
              padding: const EdgeInsets.all(12),
              child: QrImageView(
                data: qrPayload,
                size: 200,
                backgroundColor: Colors.white,
                eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.circle),
              ),
            ),
            const SizedBox(height: 16),
            _InfoRow(label: 'TC Kimlik', value: member.maskedTc),
            if (member.city != null && member.city!.isNotEmpty)
              _InfoRow(label: 'Şube', value: member.city!),
            if (member.workplace != null && member.workplace!.isNotEmpty)
              _InfoRow(label: 'Çalıştığı Kurum', value: member.workplace!),
            if (member.position != null && member.position!.isNotEmpty)
              _InfoRow(label: 'Görev', value: member.position!),
            const SizedBox(height: 12),
            Chip(
              avatar: const Icon(Icons.verified_user, size: 18),
              label: Text(member.statusLabel),
              backgroundColor: Colors.blue.shade50,
              labelStyle: TextStyle(
                color: Colors.blue.shade700,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.blueGrey,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(value, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
