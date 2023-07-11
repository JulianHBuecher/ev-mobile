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
import Message from '../../../utils/Message';
import Utils from '../../../utils/Utils';
import computeStyleSheet from './ReservationDetailsStyles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RestResponse } from '../../../types/ActionResponse';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import User from '../../../types/User';

export interface Props extends BaseProps {}

interface State {
  loading?: boolean;
  reservation?: Reservation;
  siteAreaImage?: string;
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
      siteAreaImage: null,
      isAdmin: false,
      isSiteAdmin: false,
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
    let siteAreaImage: string = null;
    let siteAreaID: string = null;
    let siteID: string = null;
    const reservationID = Utils.getParamFromNavigation(this.props.route, 'reservationID', null) as number;
    const reservation = await this.getReservation(reservationID);
    if (reservation && reservation.chargingStation.siteAreaID && this.isMounted()) {
      siteAreaImage = await this.getSiteAreaImage(reservation.chargingStation.siteAreaID);
    }
    siteAreaID = reservation.chargingStation.siteAreaID ?? null;
    siteID = reservation.chargingStation.siteID ?? null;
    this.setState({
      reservation,
      loading: false,
      siteAreaImage,
      isAdmin: this.securityProvider ? this.securityProvider.isAdmin() : false,
      isSiteAdmin: this.securityProvider && reservation && siteAreaID ? this.securityProvider.isSiteAdmin(siteID) : false,
      isCarActive: this.securityProvider.isComponentCarActive(),
      isSmartChargingActive: this.securityProvider.isComponentSmartCharging()
    });
  }

  public getReservation = async (reservationID: number): Promise<Reservation> => {
    try {
      const reservation = await this.centralServerProvider.getReservation(reservationID, {
        WithChargingStation: true,
        WithTag: true,
        WithUser: true,
        WithSiteArea: true,
        WithCar: true
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

  public getSiteAreaImage = async (siteAreaID: string): Promise<string> => {
    try {
      const siteAreaImage = await this.centralServerProvider.getSiteAreaImage(siteAreaID);
      return siteAreaImage;
    } catch (error) {
      if (error.request.status !== StatusCodes.NOT_FOUND) {
        await Utils.handleHttpUnexpectedError(this.centralServerProvider, error, 'sites.siteAreaUnexpectedError', this.props.navigation);
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

  public renderReservationStatus = (style: any) => {
    const { reservation } = this.state;
    return (
      <View style={style.columnContainer}>
        {Utils.buildReservationStatusIcon(reservation.status, style)}
        <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[style.label, style.labelValue, style.info]}>
          {Utils.translateReservationStatus(reservation.status)}
        </Text>
      </View>
    );
  };

  public renderReservationType = (style: any) => {
    const { reservation } = this.state;
    return (
      <View style={style.columnContainer}>
        {Utils.buildReservationTypeIcon(reservation.type, style)}
        <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[style.label, style.labelValue, style.info]}>
          {Utils.translateReservationType(reservation.type)}
        </Text>
      </View>
    );
  };

  public renderChargingStation = (style: any) => {
    const { reservation } = this.state;
    return (
      <View style={style.columnContainer}>
        <Icon size={scale(25)} as={MaterialCommunityIcons} name="ev-station" style={[style.icon, style.info]} />
        <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[style.label, style.labelValue, style.info]}>
          {reservation.chargingStationID}
        </Text>
      </View>
    );
  };

  public renderChargingStationConnector = (style: any) => {
    const { reservation } = this.state;
    const chargingStation = reservation?.chargingStation;
    const connector = Utils.getConnectorFromID(chargingStation, reservation.connectorID);
    return (
      <View style={style.columnContainer}>
        <View style={style.connectorDetail}>
          {Utils.buildConnectorTypeSVG(connector?.type, null, 30)}
          <Text numberOfLines={1} style={[style.label, style.labelUser, style.info]}>
            {Utils.translateConnectorType(connector.type)}
          </Text>
        </View>
      </View>
    );
  };

  public renderCar = (style: any) => {
    const { reservation } = this.state;
    return (
      <View style={style.columnContainer}>
        <Icon size={scale(25)} as={MaterialIcons} name="directions-car" style={[style.icon, style.info]} />
        <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[style.label, style.labelValue, style.info]}>
          {Utils.buildCarCatalogName(reservation?.car?.carCatalog)}
        </Text>
      </View>
    );
  };

  public render() {
    const style = computeStyleSheet();
    const { reservation } = this.state;
    const { loading, siteAreaImage, isSmartChargingActive, isCarActive } = this.state;
    const connectorLetter = Utils.getConnectorLetterFromConnectorID(reservation ? reservation.connectorID : null);
    return loading ? (
      <Spinner size={scale(30)} style={style.spinner} color="grey" />
    ) : (
      <View style={style.container}>
        <HeaderComponent
          navigation={this.props.navigation}
          title={reservation ? I18n.t('reservations.title') : I18n.t('reservations.types.unknown')}
          subTitle={`(${reservation.chargingStationID}, ${connectorLetter})`}
          containerStyle={style.headerContainer}
        />
        {/* Site Area Image */}
        <Image style={style.backgroundImage as ImageStyle} source={siteAreaImage ? { uri: siteAreaImage } : noSite} />
        <View style={style.headerContent}>
          <View style={style.headerRowContainer}>
            <Text style={style.headerName}>
              {reservation ? I18nManager.formatDateTime(reservation.fromDate, { dateStyle: 'short', timeStyle: 'short' }) : ''} -
              {reservation ? I18nManager.formatDateTime(reservation.toDate, { dateStyle: 'short', timeStyle: 'short' }) : ''}
            </Text>
            {reservation?.createdBy.id !== reservation?.tag?.userID && (
              <Text style={style.subHeaderName}>
                ({I18n.t('reservations.createdBy')}{' '}
                {Utils.buildUserName({ name: reservation.createdBy.name, firstName: reservation.createdBy.firstName } as User)})
              </Text>
            )}
          </View>
        </View>
        <ScrollView style={style.scrollViewContainer} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {this.renderUserInfo(style)}
          {this.renderReservationStatus(style)}
          {this.renderReservationType(style)}
          {this.renderChargingStation(style)}
          {this.renderChargingStationConnector(style)}
          {isCarActive && this.renderCar(style)}
        </ScrollView>
        {/* <Button
          title={I18n.t('reservations.cancel_reservation.title')}
          titleStyle={formStyle.buttonTitle}
          disabledStyle={formStyle.buttonDisabled}
          disabledTitleStyle={formStyle.buttonTextDisabled}
          containerStyle={formStyle.buttonContainer}
          buttonStyle={formStyle.button}
          loadingProps={{ color: commonColors.light }}
          onPress={() => void this.cancelReservation()}
        /> */}
      </View>
    );
  }

  private async cancelReservation() {
    const { reservation } = this.state;
    if (reservation) {
      try {
        // Cancel Reservation
        const response = await this.centralServerProvider.cancelReservation(reservation);
        if (response?.status === RestResponse.SUCCESS) {
          Message.showSuccess(
            I18n.t('reservations.cancel_reservation.success', {
              chargingStationID: reservation.chargingStationID
            })
          );
          const routes = this.props.navigation.getState().routes;
          this.props.navigation.navigate(routes[Math.max(0, routes.length - 2)].name, { refresh: true });
          return;
        } else {
          // Show message
          Message.showError(I18n.t('reservations.cancel_reservation.error', { chargingStationID: reservation.chargingStationID }));
        }
      } catch (error) {
        // Enable the button
        // this.setState({ buttonDisabled: false });
        // Other common Error
        await Utils.handleHttpUnexpectedError(this.centralServerProvider, error, 'general.unexpectedErrorBackend', this.props.navigation);
      }
    }
  }
}
