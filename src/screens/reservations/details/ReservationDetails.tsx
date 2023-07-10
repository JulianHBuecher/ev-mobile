import { StatusCodes } from 'http-status-codes';
import I18n from 'i18n-js';
import { Icon, Spinner } from 'native-base';
import React from 'react';
import { Image, ImageStyle, ScrollView, Text, View } from 'react-native';

import { scale } from 'react-native-size-matters';
import noSite from '../../../../assets/no-site.png';
import I18nManager from '../../../I18n/I18nManager';
import HeaderComponent from '../../../components/header/HeaderComponent';
import UserAvatar from '../../../components/user/avatar/UserAvatar';
import BaseScreen from '../../../screens/base-screen/BaseScreen';
import BaseProps from '../../../types/BaseProps';
import Reservation from '../../../types/Reservation';
import User from '../../../types/User';
import Message from '../../../utils/Message';
import Utils from '../../../utils/Utils';
import computeStyleSheet from './ReservationDetailsStyles';

export interface Props extends BaseProps {}

interface State {
  loading?: boolean;
  reservation?: Reservation;
  siteImage?: string;
  elapsedTimeFormatted?: string;
  totalDurationFormatted?: string;
  isSmartChargingActive?: boolean;
  isCarActive?: boolean;
  buttonDisabled?: boolean;
  refreshing?: boolean;
  isAdmin?: boolean;
  isSiteAdmin?: boolean;
}

export default class ReservationDetails extends BaseScreen<Props, State> {
  public state: State;
  public props: Props;

  public constructor(props: Props) {
    super(props);
    this.state = {
      loading: true,
      siteImage: null,
      isAdmin: false,
      isSiteAdmin: false,
      elapsedTimeFormatted: '-',
      totalDurationFormatted: '-',
      isSmartChargingActive: false,
      isCarActive: false,
      buttonDisabled: true,
      refreshing: false
    };
  }

  public setState = (
    state: State | ((prevState: Readonly<State>, props: Readonly<Props>) => State | Pick<State, never>) | Pick<State, never>,
    callback?: () => void
  ) => {
    super.setState(state, callback);
  };

  public async componentDidMount() {
    await super.componentDidMount();
    let siteImage: string = null;
    let siteID: string = null;
    const reservationID = Utils.getParamFromNavigation(this.props.route, 'reservationID', null) as number;
    const reservation = await this.getReservation(reservationID);
    if (reservation && reservation.chargingStation.siteArea.siteID && this.isMounted()) {
      siteImage = await this.getSiteImage(reservation.chargingStation.siteArea.siteID);
    }
    // this.computeDurationInfos(reservation);
    siteID = reservation.chargingStation.siteArea.siteID ?? null;
    this.setState({
      reservation,
      loading: false,
      siteImage,
      isAdmin: this.securityProvider ? this.securityProvider.isAdmin() : false,
      isSiteAdmin: this.securityProvider && reservation && siteID ? this.securityProvider.isSiteAdmin(siteID) : false,
      isCarActive: this.securityProvider.isComponentCarActive(),
      isSmartChargingActive: this.securityProvider.isComponentSmartCharging()
    });
  }

  public getReservation = async (reservationID: number): Promise<Reservation> => {
    try {
      const reservation = await this.centralServerProvider.getReservation(reservationID, {
        withChargingStation: true,
        withTag: true,
        withUser: true,
        withSiteArea: true
      });
      return reservation;
    } catch (error) {
      switch (error.request.status) {
        case StatusCodes.NOT_FOUND:
          Message.showError(I18n.t('reservations.reservationDoesNotExist'));
          break;
        default:
          await Utils.handleHttpUnexpectedError(
            this.centralServerProvider,
            error,
            'reservations.reservationUnexpectedError',
            this.props.navigation
          );
      }
    }
  };

  public getSiteImage = async (siteID: string): Promise<string> => {
    try {
      const siteImage = await this.centralServerProvider.getSiteImage(siteID);
      return siteImage;
    } catch (error) {
      if (error.request.status !== StatusCodes.NOT_FOUND) {
        await Utils.handleHttpUnexpectedError(this.centralServerProvider, error, 'sites.siteUnexpectedError', this.props.navigation);
      }
    }
    return null;
  };

  public renderUserInfo = (style: any) => {
    const { reservation } = this.state;
    return reservation.tag?.user ? (
      <View style={style.columnContainer}>
        <UserAvatar size={44} user={reservation.tag.user} navigation={this.props.navigation} />
        <Text numberOfLines={1} style={[style.label, style.labelUser, style.info]}>
          {Utils.buildUserName(reservation.tag.user)}
        </Text>
      </View>
    ) : (
      <View style={style.columnContainer}>
        <UserAvatar user={null} navigation={this.props.navigation} />
        <Text style={[style.label, style.disabled]}>-</Text>
      </View>
    );
  };

  public render() {
    const style = computeStyleSheet();
    const { reservation } = this.state;
    const { loading, siteImage, isSmartChargingActive, isCarActive } = this.state;
    const connectorLetter = Utils.getConnectorLetterFromConnectorID(reservation ? reservation.connectorID : null);
    return loading ? (
      <Spinner size={scale(30)} style={style.spinner} color="grey" />
    ) : (
      <View style={style.container}>
        <HeaderComponent
          navigation={this.props.navigation}
          title={reservation ? reservation.chargingStationID : I18n.t('reservations.types.unknown')}
          subTitle={`(${I18n.t('reservations.connector')} ${connectorLetter})`}
          containerStyle={style.headerContainer}
        />
        <Image style={style.backGroundImage as ImageStyle} source={siteImage ? { uri: siteImage } : noSite} />
        <View style={style.headerContent}>
          <View style={style.headerRowContainer}>
            <Text style={style.headerName}>
              {reservation ? I18nManager.formatDateTime(reservation.fromDate, { dateStyle: 'short', timeStyle: 'short' }) : ''} -
              {reservation ? I18nManager.formatDateTime(reservation.toDate, { dateStyle: 'short', timeStyle: 'short' }) : ''}
            </Text>
            <Text style={style.subHeaderName}>
              (
              {reservation?.expiryDate
                ? I18nManager.formatDateTime(reservation.expiryDate, { dateStyle: 'medium', timeStyle: 'short' })
                : ''}
              )
            </Text>
            {reservation?.createdBy.id !== reservation?.tag?.userID && (
              <Text style={style.subSubHeaderName}>
                ({I18n.t('reservations.createdBy')}{' '}
                {Utils.buildUserName({ name: reservation.createdBy.name, firstName: reservation.createdBy.firstName } as User)})
              </Text>
            )}
          </View>
        </View>
        <ScrollView style={style.scrollViewContainer} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {/* TODO: Add additional properties to the details view */}
          {this.renderUserInfo(style)}
        </ScrollView>
      </View>
    );
  }
}
