import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/auth_local_data_source.dart';
import '../data/member_auth_repository.dart';
import 'auth_state.dart';

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    final repository = MemberAuthRepository(ref.watch(supabaseClientProvider));
    final localDataSource = AuthLocalDataSource(
      ref.watch(secureStorageProvider),
    );
    return AuthController(repository, localDataSource);
  },
);

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository, this._localDataSource)
    : super(const AuthState.initial()) {
    unawaited(_restoreSession());
  }

  final MemberAuthRepository _repository;
  final AuthLocalDataSource _localDataSource;

  Future<void> _restoreSession() async {
    try {
      final member = await _localDataSource.loadMember();
      state = state.copyWith(
        initialized: true,
        member: member,
        clearError: true,
      );
    } catch (error) {
      state = state.copyWith(initialized: true, clearError: true);
    }
  }

  Future<void> login({
    required String tcIdentity,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final member = await _repository.login(
        tcIdentity: tcIdentity,
        password: password,
      );

      await _localDataSource.saveMember(member);

      state = state.copyWith(
        isLoading: false,
        member: member,
        initialized: true,
        clearError: true,
      );
    } on AuthException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Giriş yapılamadı. Lütfen tekrar deneyin.',
      );
    }
  }

  Future<void> refreshMember() async {
    final memberId = state.member?.id;
    if (memberId == null) {
      return;
    }

    try {
      final updatedMember = await _repository.refreshMember(memberId);
      final mergedMember = state.member!.copyWith(
        membershipNumber: updatedMember.membershipNumber,
        email: updatedMember.email,
        phone: updatedMember.phone,
        city: updatedMember.city,
        district: updatedMember.district,
        workplace: updatedMember.workplace,
        position: updatedMember.position,
        membershipStatus: updatedMember.membershipStatus,
        updatedAt: updatedMember.updatedAt,
      );

      await _localDataSource.saveMember(mergedMember);

      state = state.copyWith(member: mergedMember, clearError: true);
    } catch (_) {
      // Profil güncellenemezse sessizce devam et.
    }
  }

  Future<void> logout() async {
    await _localDataSource.clear();
    state = state.copyWith(
      member: null,
      initialized: true,
      clearError: true,
      isLoading: false,
      clearMember: true,
    );
  }
}
