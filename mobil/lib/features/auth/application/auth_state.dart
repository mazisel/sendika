import 'package:equatable/equatable.dart';

import '../domain/member.dart';

class AuthState extends Equatable {
  const AuthState({
    required this.initialized,
    required this.isLoading,
    this.member,
    this.errorMessage,
  });

  const AuthState.initial()
    : initialized = false,
      isLoading = false,
      member = null,
      errorMessage = null;

  final bool initialized;
  final bool isLoading;
  final Member? member;
  final String? errorMessage;

  AuthState copyWith({
    bool? initialized,
    bool? isLoading,
    Member? member,
    String? errorMessage,
    bool clearError = false,
    bool clearMember = false,
  }) {
    return AuthState(
      initialized: initialized ?? this.initialized,
      isLoading: isLoading ?? this.isLoading,
      member: clearMember ? null : (member ?? this.member),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [initialized, isLoading, member, errorMessage];
}
